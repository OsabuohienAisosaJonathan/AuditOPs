import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { hash, compare } from "bcrypt";
import session from "express-session";
import { insertUserSchema, insertClientSchema, insertOutletSchema, insertDepartmentSchema, insertSalesEntrySchema, insertPurchaseSchema, insertStockMovementSchema, insertReconciliationSchema, insertExceptionSchema, insertExceptionCommentSchema } from "@shared/schema";

declare module "express-session" {
  interface SessionData {
    userId: string;
  }
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Session middleware
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "audit-ops-secret-key-change-in-production",
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
      },
    })
  );

  // Auth middleware
  const requireAuth = (req: any, res: any, next: any) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    next();
  };

  // Auth Routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      const data = insertUserSchema.parse(req.body);
      const hashedPassword = await hash(data.password, 10);
      
      const user = await storage.createUser({
        ...data,
        password: hashedPassword,
      });

      req.session.userId = user.id;
      res.json({ id: user.id, username: user.username, email: user.email, fullName: user.fullName, role: user.role });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      const user = await storage.getUserByUsername(username);

      if (!user || !(await compare(password, user.password))) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      req.session.userId = user.id;
      
      // Log activity
      await storage.createAuditLog({
        userId: user.id,
        action: "Login",
        entity: "Session",
        details: "Successful login via web",
        ipAddress: req.ip || "Unknown",
      });

      res.json({ id: user.id, username: user.username, email: user.email, fullName: user.fullName, role: user.role });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy(() => {
      res.json({ success: true });
    });
  });

  app.get("/api/auth/me", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json({ id: user.id, username: user.username, email: user.email, fullName: user.fullName, role: user.role });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Clients
  app.get("/api/clients", requireAuth, async (req, res) => {
    try {
      const clients = await storage.getClients();
      res.json(clients);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/clients/:id", requireAuth, async (req, res) => {
    try {
      const client = await storage.getClient(req.params.id);
      if (!client) {
        return res.status(404).json({ error: "Client not found" });
      }
      res.json(client);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/clients", requireAuth, async (req, res) => {
    try {
      const data = insertClientSchema.parse(req.body);
      const client = await storage.createClient(data);
      
      await storage.createAuditLog({
        userId: req.session.userId!,
        action: "Created Client",
        entity: client.name,
        details: `New client added: ${client.name}`,
        ipAddress: req.ip || "Unknown",
      });

      res.json(client);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/clients/:id", requireAuth, async (req, res) => {
    try {
      const client = await storage.updateClient(req.params.id, req.body);
      if (!client) {
        return res.status(404).json({ error: "Client not found" });
      }
      res.json(client);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Outlets
  app.get("/api/clients/:clientId/outlets", requireAuth, async (req, res) => {
    try {
      const outlets = await storage.getOutlets(req.params.clientId);
      res.json(outlets);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/outlets", requireAuth, async (req, res) => {
    try {
      const data = insertOutletSchema.parse(req.body);
      const outlet = await storage.createOutlet(data);
      res.json(outlet);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Departments
  app.get("/api/outlets/:outletId/departments", requireAuth, async (req, res) => {
    try {
      const departments = await storage.getDepartments(req.params.outletId);
      res.json(departments);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/departments", requireAuth, async (req, res) => {
    try {
      const data = insertDepartmentSchema.parse(req.body);
      const department = await storage.createDepartment(data);
      res.json(department);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Sales Entries
  app.get("/api/departments/:departmentId/sales", requireAuth, async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      const sales = await storage.getSalesEntries(
        req.params.departmentId,
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );
      res.json(sales);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/sales", requireAuth, async (req, res) => {
    try {
      const data = insertSalesEntrySchema.parse({
        ...req.body,
        createdBy: req.session.userId!,
      });
      const entry = await storage.createSalesEntry(data);
      
      await storage.createAuditLog({
        userId: req.session.userId!,
        action: "Created Sales Entry",
        entity: "Sales",
        details: `Sales entry for ${req.body.shift || 'full'} shift`,
        ipAddress: req.ip || "Unknown",
      });

      res.json(entry);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/sales/:id", requireAuth, async (req, res) => {
    try {
      const entry = await storage.updateSalesEntry(req.params.id, req.body);
      if (!entry) {
        return res.status(404).json({ error: "Sales entry not found" });
      }
      res.json(entry);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Purchases
  app.get("/api/outlets/:outletId/purchases", requireAuth, async (req, res) => {
    try {
      const purchases = await storage.getPurchases(req.params.outletId);
      res.json(purchases);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/purchases", requireAuth, async (req, res) => {
    try {
      const data = insertPurchaseSchema.parse({
        ...req.body,
        createdBy: req.session.userId!,
      });
      const purchase = await storage.createPurchase(data);
      res.json(purchase);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/purchases/:id", requireAuth, async (req, res) => {
    try {
      const purchase = await storage.updatePurchase(req.params.id, req.body);
      if (!purchase) {
        return res.status(404).json({ error: "Purchase not found" });
      }
      res.json(purchase);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Stock Movements
  app.get("/api/outlets/:outletId/movements", requireAuth, async (req, res) => {
    try {
      const movements = await storage.getStockMovements(req.params.outletId);
      res.json(movements);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/movements", requireAuth, async (req, res) => {
    try {
      const data = insertStockMovementSchema.parse({
        ...req.body,
        createdBy: req.session.userId!,
      });
      const movement = await storage.createStockMovement(data);
      res.json(movement);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Reconciliations
  app.get("/api/departments/:departmentId/reconciliations", requireAuth, async (req, res) => {
    try {
      const { date } = req.query;
      const reconciliations = await storage.getReconciliations(
        req.params.departmentId,
        date ? new Date(date as string) : undefined
      );
      res.json(reconciliations);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/reconciliations", requireAuth, async (req, res) => {
    try {
      const data = insertReconciliationSchema.parse({
        ...req.body,
        createdBy: req.session.userId!,
      });
      const reconciliation = await storage.createReconciliation(data);
      res.json(reconciliation);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/reconciliations/:id", requireAuth, async (req, res) => {
    try {
      const reconciliation = await storage.updateReconciliation(req.params.id, req.body);
      if (!reconciliation) {
        return res.status(404).json({ error: "Reconciliation not found" });
      }
      res.json(reconciliation);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Exceptions
  app.get("/api/exceptions", requireAuth, async (req, res) => {
    try {
      const { outletId } = req.query;
      const exceptions = await storage.getExceptions(outletId as string | undefined);
      res.json(exceptions);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/exceptions/:id", requireAuth, async (req, res) => {
    try {
      const exception = await storage.getException(req.params.id);
      if (!exception) {
        return res.status(404).json({ error: "Exception not found" });
      }
      res.json(exception);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/exceptions", requireAuth, async (req, res) => {
    try {
      const data = insertExceptionSchema.parse({
        ...req.body,
        createdBy: req.session.userId!,
      });
      const exception = await storage.createException(data);
      
      await storage.createAuditLog({
        userId: req.session.userId!,
        action: "Created Exception",
        entity: exception.caseNumber,
        details: exception.summary,
        ipAddress: req.ip || "Unknown",
      });

      res.json(exception);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/exceptions/:id", requireAuth, async (req, res) => {
    try {
      const exception = await storage.updateException(req.params.id, req.body);
      if (!exception) {
        return res.status(404).json({ error: "Exception not found" });
      }
      res.json(exception);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Exception Comments
  app.get("/api/exceptions/:exceptionId/comments", requireAuth, async (req, res) => {
    try {
      const comments = await storage.getExceptionComments(req.params.exceptionId);
      res.json(comments);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/exceptions/:exceptionId/comments", requireAuth, async (req, res) => {
    try {
      const data = insertExceptionCommentSchema.parse({
        exceptionId: req.params.exceptionId,
        comment: req.body.comment,
        createdBy: req.session.userId!,
      });
      const comment = await storage.createExceptionComment(data);
      res.json(comment);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Audit Logs
  app.get("/api/audit-logs", requireAuth, async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const logs = await storage.getAuditLogs(limit);
      res.json(logs);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  return httpServer;
}
