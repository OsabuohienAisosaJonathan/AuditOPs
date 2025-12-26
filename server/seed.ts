import { storage } from "./storage";
import { hash } from "bcrypt";

async function seed() {
  console.log("🌱 Seeding database...");

  // Create demo user
  const hashedPassword = await hash("demo123", 10);
  const user = await storage.createUser({
    username: "john.doe",
    password: hashedPassword,
    fullName: "John Doe",
    email: "john.doe@miemploya.com",
    role: "Senior Auditor",
    phone: "+234 800 000 0000",
  });

  console.log("✓ Created demo user:", user.username);

  // Create clients
  const client1 = await storage.createClient({
    name: "The Grand Lounge",
    status: "active",
    riskScore: 85,
    varianceThreshold: "5.00",
  });

  const client2 = await storage.createClient({
    name: "Ocean View Restaurant",
    status: "active",
    riskScore: 45,
    varianceThreshold: "7.00",
  });

  const client3 = await storage.createClient({
    name: "Skybar Rooftop",
    status: "warning",
    riskScore: 92,
    varianceThreshold: "3.00",
  });

  const client4 = await storage.createClient({
    name: "Urban Bistro",
    status: "active",
    riskScore: 20,
    varianceThreshold: "10.00",
  });

  console.log("✓ Created 4 clients");

  // Create outlets for client1
  const outlet1 = await storage.createOutlet({
    clientId: client1.id,
    name: "Main Bar",
  });

  const outlet2 = await storage.createOutlet({
    clientId: client1.id,
    name: "VIP Lounge",
  });

  const outlet3 = await storage.createOutlet({
    clientId: client1.id,
    name: "Kitchen",
  });

  console.log("✓ Created 3 outlets for The Grand Lounge");

  // Create departments
  const dept1 = await storage.createDepartment({
    outletId: outlet1.id,
    name: "Beverage",
  });

  const dept2 = await storage.createDepartment({
    outletId: outlet3.id,
    name: "Food",
  });

  const dept3 = await storage.createDepartment({
    outletId: outlet1.id,
    name: "Tobacco",
  });

  console.log("✓ Created departments");

  // Create sample sales entries
  const today = new Date();
  await storage.createSalesEntry({
    departmentId: dept1.id,
    date: today,
    shift: "full",
    cashAmount: "145000.00",
    posAmount: "280000.00",
    transferAmount: "25000.00",
    voidsAmount: "2500.00",
    discountsAmount: "3500.00",
    totalSales: "450000.00",
    mode: "summary",
    createdBy: user.id,
  });

  await storage.createSalesEntry({
    departmentId: dept2.id,
    date: today,
    shift: "full",
    cashAmount: "80000.00",
    posAmount: "150000.00",
    transferAmount: "50000.00",
    voidsAmount: "0.00",
    discountsAmount: "0.00",
    totalSales: "280000.00",
    mode: "summary",
    createdBy: user.id,
  });

  console.log("✓ Created sample sales entries");

  // Create sample purchases
  await storage.createPurchase({
    outletId: outlet1.id,
    supplierName: "Global Spirits Ltd",
    invoiceRef: "INV-2025-882",
    invoiceDate: today,
    totalAmount: "450000.00",
    status: "draft",
    createdBy: user.id,
  });

  await storage.createPurchase({
    outletId: outlet1.id,
    supplierName: "Fresh Farms",
    invoiceRef: "PO-0023",
    invoiceDate: new Date(today.getTime() - 86400000),
    totalAmount: "125500.00",
    status: "grn_pending",
    createdBy: user.id,
  });

  console.log("✓ Created sample purchases");

  // Create sample exception
  await storage.createException({
    outletId: outlet1.id,
    departmentId: dept1.id,
    summary: "Missing Stock (Hennessy VSOP)",
    description: "Physical count conducted by John Doe at 09:30 AM confirmed 12 bottles. System expected 15 bottles. No transfer records found for the missing 3 units. Bar manager notified.",
    impact: "- ₦ 45,000",
    severity: "high",
    status: "open",
    evidenceUrls: ["count_sheet.pdf", "photo_01.jpg"],
    assignedTo: user.id,
    createdBy: user.id,
  });

  console.log("✓ Created sample exception");

  // Create audit log
  await storage.createAuditLog({
    userId: user.id,
    action: "Login",
    entity: "Session",
    details: "Successful login via web",
    ipAddress: "192.168.1.1",
  });

  console.log("✅ Database seeded successfully!");
  console.log("\n📝 Demo credentials:");
  console.log("   Username: john.doe");
  console.log("   Password: demo123\n");

  process.exit(0);
}

seed().catch((error) => {
  console.error("❌ Error seeding database:", error);
  process.exit(1);
});
