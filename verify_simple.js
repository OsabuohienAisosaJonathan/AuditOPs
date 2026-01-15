
require('dotenv').config();
const { Pool, neonConfig } = require('@neondatabase/serverless');
const ws = require('ws');
const fs = require('fs');

neonConfig.webSocketConstructor = ws;

function log(msg) {
  fs.appendFileSync('verify_log.txt', msg + '\n');
}

log("Simple script started");

if (!process.env.DATABASE_URL) {
  log("DATABASE_URL not set");
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function verify() {
  try {
    log("Testing connection...");
    const res = await pool.query("SELECT 1 as connected");
    log("Connection successful: " + JSON.stringify(res.rows[0]));
    process.exit(0);
  } catch (error) {
    log("Connection failed: " + error.message);
    process.exit(1);
  }
}

verify();
