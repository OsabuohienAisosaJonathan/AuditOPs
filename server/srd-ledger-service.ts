import { db } from "./db";
import { storeStock, inventoryDepartments, items, srdTransfers, stockMovements, stockMovementLines, purchaseItemEvents } from "@shared/schema";
import { eq, and, gte, lte, lt, desc, asc, sql, inArray } from "drizzle-orm";
import type { StoreStock, InsertStoreStock, InventoryDepartment, Item } from "@shared/schema";

const MAX_LOOKBACK_DAYS = 90;
const MAX_FORWARD_DAYS = 90;

interface LedgerRecalcParams {
  clientId: string;
  srdId: string;
  itemId?: string;
  startDate: Date;
  endDate?: Date;
  maxLookbackDays?: number;
  maxForwardDays?: number;
}

interface MovementSummary {
  addedQty: number;
  issuedQty: number;
  transfersInQty: number;
  transfersOutQty: number;
  interDeptInQty: number;
  interDeptOutQty: number;
  wasteQty: number;
  writeOffQty: number;
  adjustmentQty: number;
  soldQty: number;
}

function formatDateYMD(date: Date): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().split('T')[0];
}

function parseDecimal(val: string | number | null | undefined): number {
  if (val === null || val === undefined) return 0;
  const num = parseFloat(String(val));
  return isNaN(num) ? 0 : num;
}

function calculateExpectedClosing(
  opening: number,
  movements: MovementSummary
): number {
  const additions = movements.addedQty + movements.transfersInQty + movements.interDeptInQty;
  const positiveAdj = movements.adjustmentQty > 0 ? movements.adjustmentQty : 0;
  const negativeAdj = movements.adjustmentQty < 0 ? Math.abs(movements.adjustmentQty) : 0;
  const deductions = movements.issuedQty + movements.transfersOutQty + movements.interDeptOutQty +
                     movements.wasteQty + movements.writeOffQty + movements.soldQty + negativeAdj;
  
  return opening + additions + positiveAdj - deductions;
}

async function getSrdType(srdId: string): Promise<string | null> {
  const [srd] = await db.select().from(inventoryDepartments).where(eq(inventoryDepartments.id, srdId));
  return srd?.inventoryType || null;
}

async function getItemsForSrd(srdId: string, clientId: string): Promise<Item[]> {
  const [srd] = await db.select().from(inventoryDepartments).where(eq(inventoryDepartments.id, srdId));
  if (!srd) return [];
  
  return db.select().from(items).where(
    and(
      eq(items.clientId, clientId),
      eq(items.status, "active")
    )
  );
}

async function getExistingLedgerRows(
  srdId: string,
  itemId: string,
  startDate: Date,
  endDate: Date
): Promise<StoreStock[]> {
  return db.select().from(storeStock).where(
    and(
      eq(storeStock.storeDepartmentId, srdId),
      eq(storeStock.itemId, itemId),
      gte(storeStock.date, startDate),
      lte(storeStock.date, endDate)
    )
  ).orderBy(asc(storeStock.date));
}

async function getLastClosingBefore(
  srdId: string,
  itemId: string,
  beforeDate: Date
): Promise<{ closing: number; sourceDate: Date | null }> {
  const [prev] = await db.select().from(storeStock).where(
    and(
      eq(storeStock.storeDepartmentId, srdId),
      eq(storeStock.itemId, itemId),
      lt(storeStock.date, beforeDate)
    )
  ).orderBy(desc(storeStock.date)).limit(1);
  
  if (prev) {
    // CRITICAL: Always use calculated closing for forward propagation
    // This ensures backdated corrections flow through to all future dates
    const closing = parseDecimal(prev.closingQty);
    return { closing, sourceDate: prev.date };
  }
  
  return { closing: 0, sourceDate: null };
}

async function getMovementsForDate(
  clientId: string,
  srdId: string,
  itemId: string,
  date: Date
): Promise<MovementSummary> {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);
  
  const summary: MovementSummary = {
    addedQty: 0,
    issuedQty: 0,
    transfersInQty: 0,
    transfersOutQty: 0,
    interDeptInQty: 0,
    interDeptOutQty: 0,
    wasteQty: 0,
    writeOffQty: 0,
    adjustmentQty: 0,
    soldQty: 0,
  };
  
  const srdType = await getSrdType(srdId);
  
  const transfers = await db.select().from(srdTransfers).where(
    and(
      eq(srdTransfers.clientId, clientId),
      eq(srdTransfers.itemId, itemId),
      gte(srdTransfers.transferDate, startOfDay),
      lte(srdTransfers.transferDate, endOfDay),
      eq(srdTransfers.status, "posted")
    )
  );
  
  // Track processed transfers to avoid double-counting with stockMovements
  const processedTransferKeys = new Set<string>();
  
  for (const t of transfers) {
    const qty = parseDecimal(t.qty);
    // Create unique key to track this transfer
    const transferKey = `${t.fromSrdId}|${t.toSrdId}|${itemId}`;
    processedTransferKeys.add(transferKey);
    
    if (t.fromSrdId === srdId) {
      const toType = await getSrdType(t.toSrdId);
      if (srdType === "MAIN_STORE" && toType === "DEPARTMENT_STORE") {
        summary.issuedQty += qty;
      } else if (srdType === "DEPARTMENT_STORE" && toType === "MAIN_STORE") {
        summary.transfersOutQty += qty;
      } else if (srdType === "DEPARTMENT_STORE" && toType === "DEPARTMENT_STORE") {
        summary.interDeptOutQty += qty;
      } else {
        summary.transfersOutQty += qty;
      }
    }
    
    if (t.toSrdId === srdId) {
      const fromType = await getSrdType(t.fromSrdId);
      if (fromType === "MAIN_STORE" && srdType === "DEPARTMENT_STORE") {
        summary.addedQty += qty;
      } else if (fromType === "DEPARTMENT_STORE" && srdType === "MAIN_STORE") {
        summary.transfersInQty += qty;
      } else if (fromType === "DEPARTMENT_STORE" && srdType === "DEPARTMENT_STORE") {
        summary.interDeptInQty += qty;
      } else {
        summary.transfersInQty += qty;
      }
    }
  }
  
  const purchases = await db.select().from(purchaseItemEvents).where(
    and(
      eq(purchaseItemEvents.clientId, clientId),
      eq(purchaseItemEvents.srdId, srdId),
      eq(purchaseItemEvents.itemId, itemId),
      gte(purchaseItemEvents.date, startOfDay),
      lte(purchaseItemEvents.date, endOfDay)
    )
  );
  
  for (const p of purchases) {
    summary.addedQty += parseDecimal(p.qty);
  }
  
  const movements = await db.select({
    movement: stockMovements,
    line: stockMovementLines,
  }).from(stockMovements)
    .innerJoin(stockMovementLines, eq(stockMovements.id, stockMovementLines.movementId))
    .where(
      and(
        eq(stockMovements.clientId, clientId),
        eq(stockMovementLines.itemId, itemId),
        gte(stockMovements.date, startOfDay),
        lte(stockMovements.date, endOfDay)
      )
    );
  
  for (const { movement, line } of movements) {
    const qty = parseDecimal(line.qty);
    
    if (movement.fromSrdId === srdId || movement.toSrdId === srdId) {
      switch (movement.movementType) {
        case "waste":
          if (movement.fromSrdId === srdId) {
            summary.wasteQty += qty;
          }
          break;
        case "write_off":
          if (movement.fromSrdId === srdId) {
            summary.writeOffQty += qty;
          }
          break;
        case "adjustment":
          if (movement.fromSrdId === srdId || movement.toSrdId === srdId) {
            if (movement.adjustmentDirection === "increase") {
              summary.adjustmentQty += qty;
            } else if (movement.adjustmentDirection === "decrease") {
              summary.adjustmentQty -= qty;
            }
          }
          break;
        case "transfer":
          // Check if this transfer was already counted via srdTransfers to avoid double-counting
          const movementTransferKey = `${movement.fromSrdId}|${movement.toSrdId}|${itemId}`;
          if (processedTransferKeys.has(movementTransferKey)) {
            // Skip - already processed via srdTransfers
            break;
          }
          
          if (movement.fromSrdId === srdId && movement.toSrdId && movement.toSrdId !== srdId) {
            const toType = await getSrdType(movement.toSrdId);
            const fromType = await getSrdType(srdId);
            if (fromType === "MAIN_STORE" && toType === "DEPARTMENT_STORE") {
              // Main Store issuing to Department: issuedQty (Req Dep)
              summary.issuedQty += qty;
            } else if (fromType === "DEPARTMENT_STORE" && toType === "DEPARTMENT_STORE") {
              summary.interDeptOutQty += qty;
            } else if (fromType === "DEPARTMENT_STORE" && toType === "MAIN_STORE") {
              // Department returning to Main Store
              summary.transfersOutQty += qty;
            } else {
              summary.transfersOutQty += qty;
            }
          }
          if (movement.toSrdId === srdId && movement.fromSrdId && movement.fromSrdId !== srdId) {
            const fromType = await getSrdType(movement.fromSrdId);
            const toType = await getSrdType(srdId);
            if (fromType === "MAIN_STORE" && toType === "DEPARTMENT_STORE") {
              // Department receiving from Main Store: addedQty (not transfer)
              summary.addedQty += qty;
            } else if (fromType === "DEPARTMENT_STORE" && toType === "DEPARTMENT_STORE") {
              summary.interDeptInQty += qty;
            } else if (fromType === "DEPARTMENT_STORE" && toType === "MAIN_STORE") {
              // Main Store receiving return from Department
              summary.transfersInQty += qty;
            } else {
              summary.transfersInQty += qty;
            }
          }
          break;
      }
    }
  }
  
  return summary;
}

async function upsertLedgerRow(
  clientId: string,
  srdId: string,
  itemId: string,
  date: Date,
  opening: number,
  movements: MovementSummary,
  costPrice: number,
  userId?: string
): Promise<StoreStock> {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);
  
  const [existing] = await db.select().from(storeStock).where(
    and(
      eq(storeStock.storeDepartmentId, srdId),
      eq(storeStock.itemId, itemId),
      gte(storeStock.date, startOfDay),
      lte(storeStock.date, endOfDay)
    )
  );
  
  const closingQty = calculateExpectedClosing(opening, movements);
  
  const existingPhysical = existing?.physicalClosingQty !== null ? parseDecimal(existing.physicalClosingQty) : null;
  const variance = existingPhysical !== null ? existingPhysical - closingQty : 0;
  
  const rowData: Partial<InsertStoreStock> = {
    openingQty: opening.toFixed(2),
    addedQty: movements.addedQty.toFixed(2),
    issuedQty: movements.issuedQty.toFixed(2),
    transfersInQty: movements.transfersInQty.toFixed(2),
    transfersOutQty: movements.transfersOutQty.toFixed(2),
    interDeptInQty: movements.interDeptInQty.toFixed(2),
    interDeptOutQty: movements.interDeptOutQty.toFixed(2),
    wasteQty: movements.wasteQty.toFixed(2),
    writeOffQty: movements.writeOffQty.toFixed(2),
    adjustmentQty: movements.adjustmentQty.toFixed(2),
    soldQty: movements.soldQty.toFixed(2),
    closingQty: closingQty.toFixed(2),
    varianceQty: variance.toFixed(2),
    costPriceSnapshot: costPrice.toFixed(2),
  };
  
  if (existing) {
    const [updated] = await db.update(storeStock).set({
      ...rowData,
      updatedAt: new Date(),
    }).where(eq(storeStock.id, existing.id)).returning();
    return updated;
  }
  
  const [created] = await db.insert(storeStock).values({
    clientId,
    storeDepartmentId: srdId,
    itemId,
    date: startOfDay,
    ...rowData,
    createdBy: userId,
  } as InsertStoreStock).returning();
  
  return created;
}

export async function backfillSrdLedger(params: LedgerRecalcParams): Promise<{
  rowsProcessed: number;
  rowsCreated: number;
  rowsUpdated: number;
  errors: string[];
}> {
  const {
    clientId,
    srdId,
    itemId,
    startDate,
    endDate = new Date(),
    maxLookbackDays = MAX_LOOKBACK_DAYS,
    maxForwardDays = MAX_FORWARD_DAYS,
  } = params;
  
  const result = {
    rowsProcessed: 0,
    rowsCreated: 0,
    rowsUpdated: 0,
    errors: [] as string[],
  };
  
  console.log(`[SRD Ledger] Starting backfill for SRD ${srdId}, item: ${itemId || 'all'}, range: ${formatDateYMD(startDate)} to ${formatDateYMD(endDate)}`);
  
  try {
    const itemsToProcess = itemId 
      ? [{ id: itemId, costPrice: "0" }] 
      : await getItemsForSrd(srdId, clientId);
    
    for (const item of itemsToProcess) {
      const effectiveStart = new Date(startDate);
      effectiveStart.setDate(effectiveStart.getDate() - maxLookbackDays);
      effectiveStart.setHours(0, 0, 0, 0);
      
      const effectiveEnd = new Date(endDate);
      effectiveEnd.setDate(effectiveEnd.getDate() + maxForwardDays);
      effectiveEnd.setHours(23, 59, 59, 999);
      
      const today = new Date();
      if (effectiveEnd > today) {
        effectiveEnd.setTime(today.getTime());
        effectiveEnd.setHours(23, 59, 59, 999);
      }
      
      const existingRows = await getExistingLedgerRows(srdId, item.id, effectiveStart, effectiveEnd);
      const existingByDate = new Map<string, StoreStock>();
      for (const row of existingRows) {
        existingByDate.set(formatDateYMD(row.date), row);
      }
      
      const { closing: initialOpening, sourceDate } = await getLastClosingBefore(srdId, item.id, effectiveStart);
      console.log(`[SRD Ledger] Item ${item.id}: initial opening=${initialOpening} from ${sourceDate ? formatDateYMD(sourceDate) : 'none'}`);
      
      let currentOpening = initialOpening;
      const currentDate = new Date(effectiveStart);
      
      while (currentDate <= effectiveEnd) {
        const dateKey = formatDateYMD(currentDate);
        
        try {
          const movements = await getMovementsForDate(clientId, srdId, item.id, currentDate);
          
          const costPrice = parseDecimal((item as Item).costPrice);
          
          const existingRow = existingByDate.get(dateKey);
          const wasCreate = !existingRow;
          
          const updatedRow = await upsertLedgerRow(
            clientId,
            srdId,
            item.id,
            currentDate,
            currentOpening,
            movements,
            costPrice
          );
          
          if (wasCreate) {
            result.rowsCreated++;
          } else {
            result.rowsUpdated++;
          }
          result.rowsProcessed++;
          
          // CRITICAL: Always use calculated closing for the next day's opening
          // This ensures backdated corrections properly propagate forward
          // physicalClosingQty is for variance tracking only - it should NOT break the chain
          currentOpening = parseDecimal(updatedRow.closingQty);
          
        } catch (err: any) {
          result.errors.push(`Item ${item.id} on ${dateKey}: ${err.message}`);
        }
        
        currentDate.setDate(currentDate.getDate() + 1);
      }
    }
    
    console.log(`[SRD Ledger] Backfill complete: ${result.rowsProcessed} rows (${result.rowsCreated} created, ${result.rowsUpdated} updated), ${result.errors.length} errors`);
    
  } catch (err: any) {
    console.error(`[SRD Ledger] Backfill failed:`, err);
    result.errors.push(`Backfill failed: ${err.message}`);
  }
  
  return result;
}

export async function recalculateForward(
  clientId: string,
  srdId: string,
  itemId: string,
  fromDate: Date,
  maxDays: number = MAX_FORWARD_DAYS
): Promise<{ rowsUpdated: number }> {
  console.log(`[SRD Ledger] Forward recalc for SRD ${srdId}, item ${itemId} from ${formatDateYMD(fromDate)}`);
  
  const endDate = new Date(fromDate);
  endDate.setDate(endDate.getDate() + maxDays);
  
  const today = new Date();
  if (endDate > today) {
    endDate.setTime(today.getTime());
  }
  endDate.setHours(23, 59, 59, 999);
  
  const result = await backfillSrdLedger({
    clientId,
    srdId,
    itemId,
    startDate: fromDate,
    endDate,
    maxLookbackDays: 0,
    maxForwardDays: maxDays,
  });
  
  return { rowsUpdated: result.rowsUpdated + result.rowsCreated };
}

export async function postMovementToLedgers(movement: {
  clientId: string;
  date: Date;
  itemId: string;
  qty: number;
  fromSrdId?: string;
  toSrdId?: string;
  movementType: string;
  adjustmentDirection?: string;
}): Promise<void> {
  console.log(`[SRD Ledger] Posting movement: type=${movement.movementType}, item=${movement.itemId}, qty=${movement.qty}, from=${movement.fromSrdId}, to=${movement.toSrdId}`);
  
  if (movement.fromSrdId) {
    await recalculateForward(movement.clientId, movement.fromSrdId, movement.itemId, movement.date);
  }
  
  if (movement.toSrdId && movement.toSrdId !== movement.fromSrdId) {
    await recalculateForward(movement.clientId, movement.toSrdId, movement.itemId, movement.date);
  }
}

export async function ensureLedgerRowExists(
  clientId: string,
  srdId: string,
  itemId: string,
  date: Date,
  costPrice: number = 0,
  userId?: string
): Promise<StoreStock> {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);
  
  const [existing] = await db.select().from(storeStock).where(
    and(
      eq(storeStock.storeDepartmentId, srdId),
      eq(storeStock.itemId, itemId),
      gte(storeStock.date, startOfDay),
      lte(storeStock.date, endOfDay)
    )
  );
  
  if (existing) {
    return existing;
  }
  
  const { closing: opening } = await getLastClosingBefore(srdId, itemId, startOfDay);
  
  const movements: MovementSummary = {
    addedQty: 0,
    issuedQty: 0,
    transfersInQty: 0,
    transfersOutQty: 0,
    interDeptInQty: 0,
    interDeptOutQty: 0,
    wasteQty: 0,
    writeOffQty: 0,
    adjustmentQty: 0,
    soldQty: 0,
  };
  
  return upsertLedgerRow(clientId, srdId, itemId, date, opening, movements, costPrice, userId);
}

export async function backfillAllSrdsForClient(clientId: string, startDate: Date, endDate: Date = new Date()): Promise<{
  totalRows: number;
  totalCreated: number;
  totalUpdated: number;
  srdCount: number;
  errors: string[];
}> {
  console.log(`[SRD Ledger] Backfilling ALL SRDs for client ${clientId}`);
  
  const srds = await db.select().from(inventoryDepartments).where(
    and(
      eq(inventoryDepartments.clientId, clientId),
      eq(inventoryDepartments.status, "active")
    )
  );
  
  const result = {
    totalRows: 0,
    totalCreated: 0,
    totalUpdated: 0,
    srdCount: srds.length,
    errors: [] as string[],
  };
  
  for (const srd of srds) {
    const srdResult = await backfillSrdLedger({
      clientId,
      srdId: srd.id,
      startDate,
      endDate,
    });
    
    result.totalRows += srdResult.rowsProcessed;
    result.totalCreated += srdResult.rowsCreated;
    result.totalUpdated += srdResult.rowsUpdated;
    result.errors.push(...srdResult.errors);
  }
  
  console.log(`[SRD Ledger] Client backfill complete: ${result.srdCount} SRDs, ${result.totalRows} rows`);
  
  return result;
}
