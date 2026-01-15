
import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env file manually to avoid dependencies
try {
    const envPath = path.resolve(__dirname, "..", ".env");
    if (fs.existsSync(envPath)) {
        console.log("Loading .env from:", envPath);
        const envConfig = fs.readFileSync(envPath, "utf8");
        envConfig.split("\n").forEach((line) => {
            const trimmed = line.trim();
            if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
                const [key, ...valueParts] = trimmed.split("=");
                const value = valueParts.join("=").replace(/^["']|["']$/g, "").trim();
                // Don't overwrite existing env vars
                if (!process.env[key] && key) {
                    process.env[key] = value;
                }
            }
        });
    } else {
        console.warn("WARNING: .env file not found at", envPath);
    }
} catch (err) {
    console.error("Error manual parsing .env:", err);
}

// Set NODE_ENV
process.env.NODE_ENV = "development";

console.log("Starting server with NODE_ENV=development...");
console.log("DATABASE_URL present:", !!process.env.DATABASE_URL);
if (!process.env.DATABASE_URL) {
    console.error("WARNING: DATABASE_URL is not set!");
}

// Run tsx server/index.ts
// We use 'npx' to find tsx in node_modules/.bin easily, or we can resolve it directly.
// Using 'npx' is safer if path is tricky, but let's try direct spawn for better control.
const cmd = process.platform === "win32" ? "npx.cmd" : "npx";
const args = ["tsx", "server/index.ts"];

const child = spawn(cmd, args, {
    stdio: "inherit",
    shell: true,
    cwd: path.join(__dirname, ".."),
    env: process.env // Pass modified env
});

child.on("close", (code) => {
    process.exit(code ?? 0);
});
