
import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Set NODE_ENV
process.env.NODE_ENV = "development";

console.log("Starting server with NODE_ENV=development...");

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
