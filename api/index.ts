import { app, initPromise } from "../server/app";

export default async function handler(req: any, res: any) {
    // Wait for async initialization (DB, routes) to complete before handling request
    await initPromise;

    // Forward request to Express app
    return app(req, res);
}