import { storage } from "./storage";
import { hash } from "bcrypt";

async function seed() {
  // CRITICAL: Prevent seeding in production
  if (process.env.NODE_ENV === "production") {
    console.error("ERROR: Seed script cannot run in production environment!");
    console.error("This script is only for development/testing purposes.");
    process.exit(1);
  }
  
  console.log("Seeding database (development only)...");

  // Create demo user (auditor)
  const hashedPassword = await hash("Demo123!", 10);
  
  let user;
  try {
    user = await storage.createUser({
      username: "auditor",
      password: hashedPassword,
      fullName: "Demo Auditor",
      email: "auditor@miemploya.com",
      role: "auditor",
      phone: "+234 800 000 0000",
      status: "active"
    });
    console.log("Created demo auditor:", user.username);
  } catch (e) {
    console.log("Demo user already exists, fetching...");
    user = await storage.getUserByUsername("auditor");
    if (!user) {
      user = await storage.getUserByEmail("auditor@miemploya.com");
    }
    if (!user) {
      throw new Error("Could not create or find demo user");
    }
  }

  // Create client
  let client1;
  const existingClients = await storage.getClients();
  if (existingClients.length === 0) {
    client1 = await storage.createClient({
      name: "The Grand Lounge",
      status: "active",
      riskScore: 25,
      varianceThreshold: "5.00",
    });
    console.log("Created client:", client1.name);
  } else {
    client1 = existingClients[0];
    console.log("Using existing client:", client1.name);
  }

  // Create outlet
  let outlet1;
  const existingOutlets = await storage.getOutlets(client1.id);
  if (existingOutlets.length === 0) {
    outlet1 = await storage.createOutlet({
      clientId: client1.id,
      name: "Main Location",
    });
    console.log("Created outlet:", outlet1.name);
  } else {
    outlet1 = existingOutlets[0];
    console.log("Using existing outlet:", outlet1.name);
  }

  // Create 3 departments
  let departments = await storage.getDepartments(outlet1.id);
  if (departments.length === 0) {
    const deptNames = ["Main Bar", "Kitchen", "VIP Lounge"];
    for (const name of deptNames) {
      const dept = await storage.createDepartment({
        outletId: outlet1.id,
        name,
      });
      departments.push(dept);
      console.log("Created department:", dept.name);
    }
  } else {
    console.log(`Using ${departments.length} existing departments`);
  }

  // Create 2 suppliers
  let suppliers = await storage.getSuppliers(client1.id);
  if (suppliers.length === 0) {
    const supplierData = [
      { name: "Premium Beverages Ltd", contactPerson: "John Smith", phone: "+1234567890", email: "john@premiumbev.com", address: "123 Supplier St" },
      { name: "Fresh Foods Co", contactPerson: "Jane Doe", phone: "+0987654321", email: "jane@freshfoods.com", address: "456 Food Ave" }
    ];
    for (const s of supplierData) {
      const supplier = await storage.createSupplier({
        clientId: client1.id,
        ...s,
        status: "active"
      });
      suppliers.push(supplier);
      console.log("Created supplier:", supplier.name);
    }
  } else {
    console.log(`Using ${suppliers.length} existing suppliers`);
  }

  // Create 20 items
  let items = await storage.getItems(client1.id);
  if (items.length === 0) {
    const itemData = [
      { name: "Whiskey - Johnny Walker Black", sku: "JWB-750", category: "spirits", unit: "bottle", costPrice: "45.00", sellingPrice: "8.00" },
      { name: "Vodka - Grey Goose", sku: "GG-750", category: "spirits", unit: "bottle", costPrice: "35.00", sellingPrice: "7.00" },
      { name: "Rum - Bacardi White", sku: "BAC-750", category: "spirits", unit: "bottle", costPrice: "22.00", sellingPrice: "5.00" },
      { name: "Gin - Tanqueray", sku: "TAN-750", category: "spirits", unit: "bottle", costPrice: "28.00", sellingPrice: "6.00" },
      { name: "Tequila - Patron Silver", sku: "PAT-750", category: "spirits", unit: "bottle", costPrice: "55.00", sellingPrice: "10.00" },
      { name: "Beer - Heineken", sku: "HEI-330", category: "beer", unit: "bottle", costPrice: "2.50", sellingPrice: "5.00" },
      { name: "Beer - Corona", sku: "COR-330", category: "beer", unit: "bottle", costPrice: "2.75", sellingPrice: "5.50" },
      { name: "Wine - Cabernet Sauvignon", sku: "CAB-750", category: "wine", unit: "bottle", costPrice: "18.00", sellingPrice: "45.00" },
      { name: "Wine - Chardonnay", sku: "CHD-750", category: "wine", unit: "bottle", costPrice: "16.00", sellingPrice: "40.00" },
      { name: "Champagne - Moet", sku: "MOE-750", category: "wine", unit: "bottle", costPrice: "65.00", sellingPrice: "150.00" },
      { name: "Coca Cola", sku: "COK-330", category: "soft_drinks", unit: "can", costPrice: "0.50", sellingPrice: "2.50" },
      { name: "Red Bull", sku: "RDB-250", category: "soft_drinks", unit: "can", costPrice: "1.50", sellingPrice: "5.00" },
      { name: "Orange Juice", sku: "OJ-1L", category: "soft_drinks", unit: "liter", costPrice: "3.00", sellingPrice: "8.00" },
      { name: "Grilled Chicken", sku: "GC-001", category: "food", unit: "portion", costPrice: "8.00", sellingPrice: "25.00" },
      { name: "Caesar Salad", sku: "CS-001", category: "food", unit: "portion", costPrice: "5.00", sellingPrice: "18.00" },
      { name: "Club Sandwich", sku: "CB-001", category: "food", unit: "portion", costPrice: "4.00", sellingPrice: "15.00" },
      { name: "French Fries", sku: "FF-001", category: "food", unit: "portion", costPrice: "2.00", sellingPrice: "8.00" },
      { name: "Ice Cream Sundae", sku: "IC-001", category: "dessert", unit: "portion", costPrice: "3.00", sellingPrice: "12.00" },
      { name: "Cheesecake", sku: "CK-001", category: "dessert", unit: "slice", costPrice: "4.00", sellingPrice: "14.00" },
      { name: "Espresso", sku: "ESP-001", category: "beverages", unit: "cup", costPrice: "0.50", sellingPrice: "4.00" }
    ];
    for (const item of itemData) {
      const created = await storage.createItem({
        clientId: client1.id,
        ...item,
        reorderLevel: 10,
        status: "active"
      });
      items.push(created);
    }
    console.log(`Created ${items.length} items`);
  } else {
    console.log(`Using ${items.length} existing items`);
  }

  // Create sample sales entries
  const allSales = await storage.getAllSalesEntries();
  if (allSales.length === 0 && departments.length > 0) {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const salesData = [
      { date: yesterday, shift: "morning", cashAmount: "1250.00", posAmount: "2340.00", transferAmount: "560.00", voidsAmount: "45.00", discountsAmount: "120.00", totalSales: "3985.00", departmentId: departments[0].id },
      { date: yesterday, shift: "evening", cashAmount: "2890.00", posAmount: "4520.00", transferAmount: "980.00", voidsAmount: "65.00", discountsAmount: "250.00", totalSales: "8075.00", departmentId: departments[0].id },
      { date: today, shift: "morning", cashAmount: "980.00", posAmount: "1890.00", transferAmount: "420.00", voidsAmount: "30.00", discountsAmount: "95.00", totalSales: "3165.00", departmentId: departments[0].id },
    ];

    if (departments.length > 1) {
      salesData.push({ date: yesterday, shift: "full", cashAmount: "890.00", posAmount: "1560.00", transferAmount: "340.00", voidsAmount: "25.00", discountsAmount: "80.00", totalSales: "2685.00", departmentId: departments[1].id });
    }
    if (departments.length > 2) {
      salesData.push({ date: today, shift: "full", cashAmount: "1120.00", posAmount: "2100.00", transferAmount: "380.00", voidsAmount: "40.00", discountsAmount: "110.00", totalSales: "3450.00", departmentId: departments[2].id });
    }

    for (const sale of salesData) {
      await storage.createSalesEntry({
        ...sale,
        mode: "summary",
        createdBy: user.id,
      });
    }
    console.log(`Created ${salesData.length} sales entries`);
  } else {
    console.log(`Using ${allSales.length} existing sales entries`);
  }

  // Create sample purchases
  const allPurchases = await storage.getAllPurchases();
  if (allPurchases.length === 0) {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const purchase1 = await storage.createPurchase({
      outletId: outlet1.id,
      supplierName: suppliers.length > 0 ? suppliers[0].name : "Premium Beverages Ltd",
      invoiceRef: "INV-2025-001",
      invoiceDate: yesterday,
      totalAmount: "2450.00",
      status: "received",
      createdBy: user.id,
    });

    const purchase2 = await storage.createPurchase({
      outletId: outlet1.id,
      supplierName: suppliers.length > 1 ? suppliers[1].name : "Fresh Foods Co",
      invoiceRef: "INV-2025-002",
      invoiceDate: today,
      totalAmount: "1280.00",
      status: "pending",
      createdBy: user.id,
    });

    // Create purchase lines if we have items
    if (items.length >= 14) {
      await storage.createPurchaseLine({ purchaseId: purchase1.id, itemId: items[0].id, quantity: "24", unitPrice: "45.00", totalPrice: "1080.00" });
      await storage.createPurchaseLine({ purchaseId: purchase1.id, itemId: items[1].id, quantity: "24", unitPrice: "35.00", totalPrice: "840.00" });
      await storage.createPurchaseLine({ purchaseId: purchase1.id, itemId: items[5].id, quantity: "48", unitPrice: "2.50", totalPrice: "120.00" });
      await storage.createPurchaseLine({ purchaseId: purchase2.id, itemId: items[13].id, quantity: "50", unitPrice: "8.00", totalPrice: "400.00" });
    }
    console.log("Created 2 purchases with line items");
  } else {
    console.log(`Using ${allPurchases.length} existing purchases`);
  }

  // Create sample reconciliation
  const allRecons = await storage.getAllReconciliations();
  if (allRecons.length === 0 && departments.length > 0) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    await storage.createReconciliation({
      departmentId: departments[0].id,
      date: yesterday,
      openingStock: { "JWB-750": 12, "GG-750": 8, "HEI-330": 48 },
      additions: { "JWB-750": 24, "GG-750": 24, "HEI-330": 48 },
      expectedUsage: { "JWB-750": 8, "GG-750": 10, "HEI-330": 36 },
      physicalCount: { "JWB-750": 27, "GG-750": 22, "HEI-330": 58 },
      varianceQty: "-3",
      varianceValue: "-50.00",
      status: "pending",
      createdBy: user.id,
    });
    console.log("Created 1 reconciliation");
  } else {
    console.log(`Using ${allRecons.length} existing reconciliations`);
  }

  // Create sample exceptions
  const allExceptions = await storage.getExceptions();
  if (allExceptions.length === 0 && departments.length > 0) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    await storage.createException({
      outletId: outlet1.id,
      departmentId: departments[0].id,
      summary: "Stock variance detected in Main Bar",
      description: "1 bottle of Johnny Walker Black missing from physical count vs expected.",
      impact: "Potential loss of $45",
      severity: "medium",
      status: "open",
      createdBy: user.id,
    });

    await storage.createException({
      outletId: outlet1.id,
      departmentId: departments[0].id,
      summary: "High void rate during evening shift",
      description: "Void rate of 3.2% exceeds threshold of 2%. 14 void transactions recorded.",
      impact: "Revenue concern - $65 in voids",
      severity: "low",
      status: "investigating",
      createdBy: user.id,
    });
    console.log("Created 2 exceptions");
  } else {
    console.log(`Using ${allExceptions.length} existing exceptions`);
  }

  // Create audit log entries
  await storage.createAuditLog({
    userId: user.id,
    action: "Seed",
    entity: "System",
    details: "Database seeded with sample data",
    ipAddress: "127.0.0.1",
  });

  console.log("\nSeed completed successfully!");
  console.log("\nSummary:");
  console.log("- 1 Client: The Grand Lounge");
  console.log("- 1 Outlet: Main Location");
  console.log("- 3 Departments: Main Bar, Kitchen, VIP Lounge");
  console.log("- 2 Suppliers");
  console.log("- 20 Items across spirits, beer, wine, food, desserts");
  console.log("- Sample sales, purchases, reconciliation, and exceptions");

  process.exit(0);
}

seed().catch((error) => {
  console.error("Error seeding database:", error);
  process.exit(1);
});
