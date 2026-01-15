import { app, httpServer, log } from "./app";

// Start server IMMEDIATELY so health checks respond
// This MUST happen BEFORE async DB initialization (which is running in background in app.ts)
const port = parseInt(process.env.PORT || "5000", 10);

httpServer.listen(
  {
    port,
    host: "0.0.0.0",
    reusePort: true,
  },
  () => {
    log(`serving on port ${port} (health checks ready)`);
  },
);
