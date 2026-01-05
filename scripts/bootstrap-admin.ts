#!/usr/bin/env npx tsx
/**
 * Admin Bootstrap Script
 * 
 * Creates or updates admin users from environment variables.
 * Run from Replit shell: npx tsx scripts/bootstrap-admin.ts
 * 
 * Environment variables:
 *   BOOTSTRAP_SUPERADMIN_EMAIL     - Super admin email
 *   BOOTSTRAP_SUPERADMIN_PASSWORD  - Super admin password
 *   BOOTSTRAP_SUPERVISOR_EMAIL     - Supervisor email (optional)
 *   BOOTSTRAP_SUPERVISOR_PASSWORD  - Supervisor password (optional)
 */

import { db } from "../server/db";
import { users } from "../shared/schema";
import { eq } from "drizzle-orm";
import { hash } from "bcrypt";

const SALT_ROUNDS = 12;

function isStrongPassword(password: string): boolean {
  if (password.length < 8) return false;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  return hasUpper && hasLower && hasNumber;
}

async function createOrUpdateAdmin(
  email: string,
  password: string,
  role: "super_admin" | "supervisor",
  fullName?: string
): Promise<{ action: "created" | "updated"; userId: string }> {
  const normalizedEmail = email.trim().toLowerCase();
  
  if (!isStrongPassword(password)) {
    throw new Error(`Password for ${email} must be at least 8 characters with uppercase, lowercase, and a number`);
  }
  
  const hashedPassword = await hash(password, SALT_ROUNDS);
  
  const [existingUser] = await db.select().from(users).where(eq(users.email, normalizedEmail)).limit(1);
  
  if (existingUser) {
    await db.update(users).set({
      password: hashedPassword,
      role,
      emailVerified: true,
      mustChangePassword: false,
      status: "active",
      loginAttempts: 0,
      lockedUntil: null,
    }).where(eq(users.id, existingUser.id));
    
    return { action: "updated", userId: existingUser.id };
  }
  
  const username = normalizedEmail.split("@")[0];
  
  const [newUser] = await db.insert(users).values({
    email: normalizedEmail,
    username,
    password: hashedPassword,
    fullName: fullName || (role === "super_admin" ? "Super Admin" : "Supervisor"),
    role,
    status: "active",
    emailVerified: true,
    mustChangePassword: false,
  }).returning();
  
  return { action: "created", userId: newUser.id };
}

async function main() {
  console.log("=".repeat(50));
  console.log("Admin Bootstrap Script");
  console.log("=".repeat(50));
  
  const superAdminEmail = process.env.BOOTSTRAP_SUPERADMIN_EMAIL;
  const superAdminPassword = process.env.BOOTSTRAP_SUPERADMIN_PASSWORD;
  const supervisorEmail = process.env.BOOTSTRAP_SUPERVISOR_EMAIL;
  const supervisorPassword = process.env.BOOTSTRAP_SUPERVISOR_PASSWORD;
  
  let hasChanges = false;
  
  if (superAdminEmail && superAdminPassword) {
    try {
      console.log(`\nProcessing Super Admin: ${superAdminEmail}`);
      const result = await createOrUpdateAdmin(superAdminEmail, superAdminPassword, "super_admin");
      console.log(`  ✓ Super Admin ${result.action}: ${result.userId}`);
      hasChanges = true;
    } catch (err: any) {
      console.error(`  ✗ Super Admin failed: ${err.message}`);
    }
  } else {
    console.log("\nSkipping Super Admin (BOOTSTRAP_SUPERADMIN_EMAIL or BOOTSTRAP_SUPERADMIN_PASSWORD not set)");
  }
  
  if (supervisorEmail && supervisorPassword) {
    try {
      console.log(`\nProcessing Supervisor: ${supervisorEmail}`);
      const result = await createOrUpdateAdmin(supervisorEmail, supervisorPassword, "supervisor");
      console.log(`  ✓ Supervisor ${result.action}: ${result.userId}`);
      hasChanges = true;
    } catch (err: any) {
      console.error(`  ✗ Supervisor failed: ${err.message}`);
    }
  } else {
    console.log("\nSkipping Supervisor (BOOTSTRAP_SUPERVISOR_EMAIL or BOOTSTRAP_SUPERVISOR_PASSWORD not set)");
  }
  
  console.log("\n" + "=".repeat(50));
  if (hasChanges) {
    console.log("Bootstrap complete! Users can now log in.");
  } else {
    console.log("No changes made. Set environment variables and run again.");
    console.log("\nUsage:");
    console.log("  BOOTSTRAP_SUPERADMIN_EMAIL=admin@example.com \\");
    console.log("  BOOTSTRAP_SUPERADMIN_PASSWORD=SecurePass123! \\");
    console.log("  npx tsx scripts/bootstrap-admin.ts");
  }
  console.log("=".repeat(50));
  
  process.exit(0);
}

main().catch((err) => {
  console.error("Bootstrap failed:", err);
  process.exit(1);
});
