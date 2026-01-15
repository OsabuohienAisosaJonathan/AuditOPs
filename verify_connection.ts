
import "dotenv/config";
import { pool } from "./server/db";

console.log("Script started");

async function verify() {
    try {
        console.log("Testing connection...");
        // Force a simple query
        const res = await pool.query("SELECT 1 as connected");
        console.log("Connection successful:", res.rows[0]);
        process.exit(0);
    } catch (error) {
        console.error("Connection failed:", error);
        process.exit(1);
    }
}

verify();
