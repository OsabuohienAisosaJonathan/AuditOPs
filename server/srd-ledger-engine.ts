// SRD LEDGER ENGINE (Main + Department) — single source of truth
// Supports: backdated recalc forward up to 90 days, transfers, returns, requisitions, waste, write-off, adjustment, sold
// Based on design document logic

import { db, pool } from "./db";
import { srdLedgerDaily, srdStockMovements, inventoryDepartments } from "@shared/schema";
import type { SrdLedgerDaily, SrdStockMovement, SrdLedgerType, SrdMovementEventType } from "@shared/schema";
import { eq, and, gte, lte, lt, asc, desc, sql } from "drizzle-orm";

const MAX_RECALC_DAYS = 90;

export interface StockMovementInput {
  clientId: string;
  movementDate: string; // YYYY-MM-DD
  eventType: SrdMovementEventType;
  fromSrdId?: string | null;
  toSrdId?: string | null;
  itemId: string;
  qty: number; // positive
  description?: string | null;
}

export interface StockMovementRecord extends StockMovementInput {
  id: string;
  isDeleted: boolean;
}

// Helper to format date as YYYY-MM-DD
function formatDateYMD(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toISOString().split('T')[0];
}

// Get SRD type from inventory_departments table
async function getSrdType(srdId: string): Promise<SrdLedgerType> {
  const [srd] = await db.select().from(inventoryDepartments).where(eq(inventoryDepartments.id, srdId));
  if (!srd) return "DEPARTMENT";
  return srd.inventoryType === "MAIN_STORE" ? "MAIN" : "DEPARTMENT";
}

// Validate movement input based on event type
function validateMovementInput(mv: StockMovementInput): void {
  switch (mv.eventType) {
    case "PURCHASE":
      if (!mv.toSrdId) throw new Error("PURCHASE requires toSrdId (Main Store SRD)");
      break;
    case "REQ_MAIN_TO_DEP":
      if (!mv.fromSrdId) throw new Error("REQ_MAIN_TO_DEP requires fromSrdId (Main Store SRD)");
      if (!mv.toSrdId) throw new Error("REQ_MAIN_TO_DEP requires toSrdId (Department Store SRD)");
      break;
    case "RETURN_DEP_TO_MAIN":
      if (!mv.fromSrdId) throw new Error("RETURN_DEP_TO_MAIN requires fromSrdId (Department Store SRD)");
      if (!mv.toSrdId) throw new Error("RETURN_DEP_TO_MAIN requires toSrdId (Main Store SRD)");
      break;
    case "TRANSFER_DEP_TO_DEP":
      if (!mv.fromSrdId) throw new Error("TRANSFER_DEP_TO_DEP requires fromSrdId");
      if (!mv.toSrdId) throw new Error("TRANSFER_DEP_TO_DEP requires toSrdId");
      break;
    case "WASTE":
    case "WRITE_OFF":
    case "ADJUSTMENT":
    case "SOLD":
      if (!mv.fromSrdId) throw new Error(`${mv.eventType} requires fromSrdId (the store SRD)`);
      break;
    default:
      throw new Error(`Unknown event type: ${mv.eventType}`);
  }

  if (mv.qty < 0) throw new Error("qty must be non-negative");
  if (!mv.itemId) throw new Error("itemId is required");
  if (!mv.clientId) throw new Error("clientId is required");
  if (!mv.movementDate) throw new Error("movementDate is required");
}

export class SrdLedgerEngine {
  // --- PUBLIC API ---

  /**
   * Create a new movement and post it to the ledger
   * Uses database transaction for atomicity
   */
  async createMovementAndPost(mv: StockMovementInput): Promise<StockMovementRecord> {
    // Validate BEFORE any database operations
    validateMovementInput(mv);

    // Use raw SQL transaction via pool for true atomicity
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Insert movement record
      const insertResult = await client.query(
        `INSERT INTO srd_stock_movements 
         (client_id, movement_date, event_type, from_srd_id, to_srd_id, item_id, qty, description, is_deleted)
         VALUES ($1, $2::date, $3, $4, $5, $6, $7, $8, false)
         RETURNING id, client_id, movement_date::text, event_type, from_srd_id, to_srd_id, item_id, qty::float8, description, is_deleted`,
        [
          mv.clientId,
          mv.movementDate,
          mv.eventType,
          mv.fromSrdId ?? null,
          mv.toSrdId ?? null,
          mv.itemId,
          mv.qty,
          mv.description ?? null,
        ]
      );

      const inserted = insertResult.rows[0];
      const movement: StockMovementRecord = {
        id: inserted.id,
        clientId: inserted.client_id,
        movementDate: inserted.movement_date,
        eventType: inserted.event_type as SrdMovementEventType,
        fromSrdId: inserted.from_srd_id,
        toSrdId: inserted.to_srd_id,
        itemId: inserted.item_id,
        qty: inserted.qty,
        description: inserted.description,
        isDeleted: inserted.is_deleted,
      };

      // Apply delta to ledger (within transaction)
      await this.applyMovementDeltaWithClient(client, movement, +1);

      await client.query("COMMIT");

      // Recalc forward (outside transaction - safe to fail separately)
      await this.recalcForward(
        movement.clientId,
        movement.itemId,
        movement.fromSrdId,
        movement.toSrdId,
        movement.movementDate,
        MAX_RECALC_DAYS
      );

      return movement;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Update an existing movement and recompute the ledger
   * Uses database transaction for atomicity
   */
  async updateMovementAndRepost(
    movementId: string,
    patch: Partial<Omit<StockMovementInput, "clientId">>
  ): Promise<void> {
    // Get old movement first
    const [oldMv] = await db.select().from(srdStockMovements).where(eq(srdStockMovements.id, movementId));
    if (!oldMv) throw new Error("Movement not found");

    // Build the new movement state to validate
    const newMovementState: StockMovementInput = {
      clientId: oldMv.clientId,
      movementDate: patch.movementDate ?? oldMv.movementDate,
      eventType: (patch.eventType ?? oldMv.eventType) as SrdMovementEventType,
      fromSrdId: patch.fromSrdId !== undefined ? patch.fromSrdId : oldMv.fromSrdId,
      toSrdId: patch.toSrdId !== undefined ? patch.toSrdId : oldMv.toSrdId,
      itemId: patch.itemId ?? oldMv.itemId,
      qty: patch.qty ?? parseFloat(oldMv.qty),
      description: patch.description !== undefined ? patch.description : oldMv.description,
    };

    // Validate the new state BEFORE any database operations
    validateMovementInput(newMovementState);

    const oldMovement: StockMovementRecord = {
      id: oldMv.id,
      clientId: oldMv.clientId,
      movementDate: oldMv.movementDate,
      eventType: oldMv.eventType as SrdMovementEventType,
      fromSrdId: oldMv.fromSrdId,
      toSrdId: oldMv.toSrdId,
      itemId: oldMv.itemId,
      qty: parseFloat(oldMv.qty),
      description: oldMv.description,
      isDeleted: oldMv.isDeleted,
    };

    // Use raw SQL transaction for atomicity
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Reverse old effect
      await this.applyMovementDeltaWithClient(client, oldMovement, -1);

      // Update movement record
      const setClauses: string[] = ["updated_at = now()"];
      const values: any[] = [];
      let paramIndex = 1;

      if (patch.movementDate !== undefined) {
        setClauses.push(`movement_date = $${paramIndex++}::date`);
        values.push(patch.movementDate);
      }
      if (patch.eventType !== undefined) {
        setClauses.push(`event_type = $${paramIndex++}`);
        values.push(patch.eventType);
      }
      if (patch.fromSrdId !== undefined) {
        setClauses.push(`from_srd_id = $${paramIndex++}`);
        values.push(patch.fromSrdId);
      }
      if (patch.toSrdId !== undefined) {
        setClauses.push(`to_srd_id = $${paramIndex++}`);
        values.push(patch.toSrdId);
      }
      if (patch.itemId !== undefined) {
        setClauses.push(`item_id = $${paramIndex++}`);
        values.push(patch.itemId);
      }
      if (patch.qty !== undefined) {
        setClauses.push(`qty = $${paramIndex++}`);
        values.push(patch.qty);
      }
      if (patch.description !== undefined) {
        setClauses.push(`description = $${paramIndex++}`);
        values.push(patch.description);
      }

      values.push(movementId);

      const updateResult = await client.query(
        `UPDATE srd_stock_movements 
         SET ${setClauses.join(", ")}
         WHERE id = $${paramIndex}
         RETURNING id, client_id, movement_date::text, event_type, from_srd_id, to_srd_id, item_id, qty::float8, description, is_deleted`,
        values
      );

      const newMv = updateResult.rows[0];
      const newMovement: StockMovementRecord = {
        id: newMv.id,
        clientId: newMv.client_id,
        movementDate: newMv.movement_date,
        eventType: newMv.event_type as SrdMovementEventType,
        fromSrdId: newMv.from_srd_id,
        toSrdId: newMv.to_srd_id,
        itemId: newMv.item_id,
        qty: newMv.qty,
        description: newMv.description,
        isDeleted: newMv.is_deleted,
      };

      // Apply new effect
      await this.applyMovementDeltaWithClient(client, newMovement, +1);

      await client.query("COMMIT");

      // Recalc forward (outside transaction - safe to fail separately)
      // Use the EARLIEST date between old and new movement dates
      const oldDate = new Date(oldMovement.movementDate);
      const newDate = new Date(newMovement.movementDate);
      const earliestDate = formatDateYMD(new Date(Math.min(oldDate.getTime(), newDate.getTime())));

      // Collect all unique SRDs affected
      const affectedSrds: string[] = [];
      if (oldMovement.fromSrdId && !affectedSrds.includes(oldMovement.fromSrdId)) affectedSrds.push(oldMovement.fromSrdId);
      if (oldMovement.toSrdId && !affectedSrds.includes(oldMovement.toSrdId)) affectedSrds.push(oldMovement.toSrdId);
      if (newMovement.fromSrdId && !affectedSrds.includes(newMovement.fromSrdId)) affectedSrds.push(newMovement.fromSrdId);
      if (newMovement.toSrdId && !affectedSrds.includes(newMovement.toSrdId)) affectedSrds.push(newMovement.toSrdId);

      // Collect all unique items affected
      const affectedItems: string[] = [oldMovement.itemId];
      if (newMovement.itemId !== oldMovement.itemId) affectedItems.push(newMovement.itemId);

      // Recalc all affected SRDs starting from the earliest date
      for (const srdId of affectedSrds) {
        for (const itemId of affectedItems) {
          await this.recalcOneStoreOneItem(
            oldMovement.clientId,
            srdId,
            itemId,
            earliestDate,
            MAX_RECALC_DAYS
          );
        }
      }
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Delete (soft-delete) a movement and reverse its effect
   * Uses database transaction for atomicity
   */
  async deleteMovementAndReverse(movementId: string): Promise<void> {
    const [mv] = await db.select().from(srdStockMovements).where(eq(srdStockMovements.id, movementId));
    if (!mv) throw new Error("Movement not found");

    if (mv.isDeleted) return; // Already deleted

    const movement: StockMovementRecord = {
      id: mv.id,
      clientId: mv.clientId,
      movementDate: mv.movementDate,
      eventType: mv.eventType as SrdMovementEventType,
      fromSrdId: mv.fromSrdId,
      toSrdId: mv.toSrdId,
      itemId: mv.itemId,
      qty: parseFloat(mv.qty),
      description: mv.description,
      isDeleted: mv.isDeleted,
    };

    // Use raw SQL transaction for atomicity
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Reverse effect
      await this.applyMovementDeltaWithClient(client, movement, -1);

      // Mark deleted
      await client.query(
        `UPDATE srd_stock_movements SET is_deleted = true, updated_at = now() WHERE id = $1`,
        [movementId]
      );

      await client.query("COMMIT");

      // Recalc forward (outside transaction - safe to fail separately)
      await this.recalcForward(
        movement.clientId,
        movement.itemId,
        movement.fromSrdId,
        movement.toSrdId,
        movement.movementDate,
        MAX_RECALC_DAYS
      );
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  // --- INTERNALS ---

  /**
   * Apply movement delta into ledger rows using a transaction client
   */
  private async applyMovementDeltaWithClient(
    client: any,
    mv: StockMovementRecord,
    sign: 1 | -1
  ): Promise<void> {
    if (mv.isDeleted) return;
    const qty = mv.qty * sign;

    switch (mv.eventType) {
      case "PURCHASE": {
        const srdType = await this.getSrdTypeWithClient(client, mv.toSrdId!);
        await this.upsertAndBumpWithClient(client, mv.clientId, mv.toSrdId!, srdType, mv.itemId, mv.movementDate, {
          purchase_added_qty: qty,
        });
        break;
      }

      case "REQ_MAIN_TO_DEP": {
        await this.upsertAndBumpWithClient(client, mv.clientId, mv.fromSrdId!, "MAIN", mv.itemId, mv.movementDate, {
          req_dep_total_qty: qty,
        });
        await this.upsertAndBumpWithClient(client, mv.clientId, mv.toSrdId!, "DEPARTMENT", mv.itemId, mv.movementDate, {
          from_main_qty: qty,
        });
        break;
      }

      case "RETURN_DEP_TO_MAIN": {
        await this.upsertAndBumpWithClient(client, mv.clientId, mv.fromSrdId!, "DEPARTMENT", mv.itemId, mv.movementDate, {
          returns_out_to_main: qty,
        });
        await this.upsertAndBumpWithClient(client, mv.clientId, mv.toSrdId!, "MAIN", mv.itemId, mv.movementDate, {
          returns_in_qty: qty,
        });
        break;
      }

      case "TRANSFER_DEP_TO_DEP": {
        await this.upsertAndBumpWithClient(client, mv.clientId, mv.fromSrdId!, "DEPARTMENT", mv.itemId, mv.movementDate, {
          inter_out_qty: qty,
        });
        await this.upsertAndBumpWithClient(client, mv.clientId, mv.toSrdId!, "DEPARTMENT", mv.itemId, mv.movementDate, {
          inter_in_qty: qty,
        });
        break;
      }

      case "WASTE": {
        const srdType = await this.getSrdTypeWithClient(client, mv.fromSrdId!);
        await this.upsertAndBumpWithClient(client, mv.clientId, mv.fromSrdId!, srdType, mv.itemId, mv.movementDate, {
          waste_qty: qty,
        });
        break;
      }

      case "WRITE_OFF": {
        const srdType = await this.getSrdTypeWithClient(client, mv.fromSrdId!);
        await this.upsertAndBumpWithClient(client, mv.clientId, mv.fromSrdId!, srdType, mv.itemId, mv.movementDate, {
          write_off_qty: qty,
        });
        break;
      }

      case "ADJUSTMENT": {
        const srdType = await this.getSrdTypeWithClient(client, mv.fromSrdId!);
        await this.upsertAndBumpWithClient(client, mv.clientId, mv.fromSrdId!, srdType, mv.itemId, mv.movementDate, {
          adjustment_qty: qty, // can be negative
        });
        break;
      }

      case "SOLD": {
        await this.upsertAndBumpWithClient(client, mv.clientId, mv.fromSrdId!, "DEPARTMENT", mv.itemId, mv.movementDate, {
          sold_qty: qty,
        });
        break;
      }

      default:
        throw new Error(`Unknown movement type: ${mv.eventType}`);
    }
  }

  private async getSrdTypeWithClient(client: any, srdId: string): Promise<SrdLedgerType> {
    const result = await client.query(
      `SELECT inventory_type FROM inventory_departments WHERE id = $1`,
      [srdId]
    );
    if (result.rows.length === 0) return "DEPARTMENT";
    return result.rows[0].inventory_type === "MAIN_STORE" ? "MAIN" : "DEPARTMENT";
  }

  /**
   * Upsert ledger row and bump movement columns using transaction client
   */
  private async upsertAndBumpWithClient(
    client: any,
    clientId: string,
    srdId: string,
    srdType: SrdLedgerType,
    itemId: string,
    dateStr: string,
    deltas: Record<string, number>
  ): Promise<void> {
    // Ensure row exists (upsert)
    await client.query(
      `INSERT INTO srd_ledger_daily (client_id, srd_id, srd_type, item_id, ledger_date)
       VALUES ($1, $2, $3, $4, $5::date)
       ON CONFLICT (srd_id, item_id, ledger_date) DO NOTHING`,
      [clientId, srdId, srdType, itemId, dateStr]
    );

    // Build update for deltas
    const setClauses: string[] = ["updated_at = now()"];
    const values: any[] = [];
    let paramIndex = 1;

    for (const [col, delta] of Object.entries(deltas)) {
      if (delta !== 0) {
        setClauses.push(`${col} = ${col} + $${paramIndex++}`);
        values.push(delta);
      }
    }

    values.push(srdId, itemId, dateStr);

    await client.query(
      `UPDATE srd_ledger_daily 
       SET ${setClauses.join(", ")}
       WHERE srd_id = $${paramIndex++} AND item_id = $${paramIndex++} AND ledger_date = $${paramIndex}::date`,
      values
    );
  }

  /**
   * Recalc forward for affected SRDs (from date for up to N days)
   * This runs outside of the main transaction since it's a batch operation
   */
  private async recalcForward(
    clientId: string,
    itemId: string,
    fromSrdId: string | null | undefined,
    toSrdId: string | null | undefined,
    startDate: string,
    days: number
  ): Promise<void> {
    const srdIds = Array.from(new Set([fromSrdId, toSrdId].filter(Boolean))) as string[];
    for (const srdId of srdIds) {
      await this.recalcOneStoreOneItem(clientId, srdId, itemId, startDate, days);
    }
  }

  /**
   * Recalculate opening/closing for one SRD + one item starting from a date
   */
  private async recalcOneStoreOneItem(
    clientId: string,
    srdId: string,
    itemId: string,
    startDate: string,
    days: number
  ): Promise<void> {
    // Get SRD type
    const srdType = await getSrdType(srdId);

    // Calculate end date
    const endD = new Date(startDate);
    endD.setDate(endD.getDate() + days);
    const endDateStr = formatDateYMD(endD);

    // Create rows for date range (so we never skip days)
    for (let i = 0; i <= days; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      const dateStr = formatDateYMD(d);
      
      const exists = await db.select({ id: srdLedgerDaily.id }).from(srdLedgerDaily).where(
        and(
          eq(srdLedgerDaily.srdId, srdId),
          eq(srdLedgerDaily.itemId, itemId),
          eq(srdLedgerDaily.ledgerDate, dateStr)
        )
      );

      if (exists.length === 0) {
        await db.insert(srdLedgerDaily).values({
          clientId,
          srdId,
          srdType,
          itemId,
          ledgerDate: dateStr,
          openingQty: "0",
          closingQty: "0",
          purchaseAddedQty: "0",
          returnsInQty: "0",
          reqDepTotalQty: "0",
          fromMainQty: "0",
          interInQty: "0",
          interOutQty: "0",
          returnsOutToMain: "0",
          soldQty: "0",
          wasteQty: "0",
          writeOffQty: "0",
          adjustmentQty: "0",
        });
      }
    }

    // Load rows ordered
    const rows = await db.select().from(srdLedgerDaily).where(
      and(
        eq(srdLedgerDaily.clientId, clientId),
        eq(srdLedgerDaily.srdId, srdId),
        eq(srdLedgerDaily.itemId, itemId),
        gte(srdLedgerDaily.ledgerDate, startDate),
        lte(srdLedgerDaily.ledgerDate, endDateStr)
      )
    ).orderBy(asc(srdLedgerDaily.ledgerDate));

    // Get previous day closing for startDate
    const prevRows = await db.select({ closingQty: srdLedgerDaily.closingQty }).from(srdLedgerDaily).where(
      and(
        eq(srdLedgerDaily.clientId, clientId),
        eq(srdLedgerDaily.srdId, srdId),
        eq(srdLedgerDaily.itemId, itemId),
        lt(srdLedgerDaily.ledgerDate, startDate)
      )
    ).orderBy(desc(srdLedgerDaily.ledgerDate)).limit(1);

    let prevClosing = parseFloat(prevRows[0]?.closingQty ?? "0");

    for (const r of rows) {
      const opening = prevClosing;
      let closingExpected = 0;

      if (srdType === "MAIN") {
        // MAIN STORE formula:
        // Closing = Opening + Purchase + ReturnsIn - Waste - WriteOff - ReqDepTotal
        closingExpected =
          opening +
          parseFloat(r.purchaseAddedQty || "0") +
          parseFloat(r.returnsInQty || "0") -
          parseFloat(r.wasteQty || "0") -
          parseFloat(r.writeOffQty || "0") -
          parseFloat(r.reqDepTotalQty || "0");
      } else {
        // DEPARTMENT formula:
        // Closing = Opening + FromMain + InterIn + Adjustment - (InterOut + ReturnsOut + Waste + WriteOff + Sold)
        closingExpected =
          opening +
          parseFloat(r.fromMainQty || "0") +
          parseFloat(r.interInQty || "0") +
          parseFloat(r.adjustmentQty || "0") -
          (parseFloat(r.interOutQty || "0") +
            parseFloat(r.returnsOutToMain || "0") +
            parseFloat(r.wasteQty || "0") +
            parseFloat(r.writeOffQty || "0") +
            parseFloat(r.soldQty || "0"));
      }

      await db.update(srdLedgerDaily)
        .set({
          openingQty: opening.toFixed(2),
          closingQty: closingExpected.toFixed(2),
          updatedAt: new Date(),
        })
        .where(eq(srdLedgerDaily.id, r.id));

      prevClosing = closingExpected;
    }
  }

  // --- QUERY METHODS ---

  /**
   * Get ledger rows for a specific SRD and date range
   */
  async getLedgerRows(
    clientId: string,
    srdId: string,
    startDate: string,
    endDate: string,
    itemId?: string
  ): Promise<SrdLedgerDaily[]> {
    const conditions = [
      eq(srdLedgerDaily.clientId, clientId),
      eq(srdLedgerDaily.srdId, srdId),
      gte(srdLedgerDaily.ledgerDate, startDate),
      lte(srdLedgerDaily.ledgerDate, endDate),
    ];

    if (itemId) {
      conditions.push(eq(srdLedgerDaily.itemId, itemId));
    }

    return db.select().from(srdLedgerDaily)
      .where(and(...conditions))
      .orderBy(asc(srdLedgerDaily.ledgerDate), asc(srdLedgerDaily.itemId));
  }

  /**
   * Get all movements for a client within a date range
   */
  async getMovements(
    clientId: string,
    startDate: string,
    endDate: string,
    includeDeleted = false
  ): Promise<SrdStockMovement[]> {
    const conditions = [
      eq(srdStockMovements.clientId, clientId),
      gte(srdStockMovements.movementDate, startDate),
      lte(srdStockMovements.movementDate, endDate),
    ];

    if (!includeDeleted) {
      conditions.push(eq(srdStockMovements.isDeleted, false));
    }

    return db.select().from(srdStockMovements)
      .where(and(...conditions))
      .orderBy(desc(srdStockMovements.movementDate));
  }
}

// Singleton instance
export const srdLedgerEngine = new SrdLedgerEngine();
