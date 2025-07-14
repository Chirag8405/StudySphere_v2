import serverless from "serverless-http";
import { createServer } from "./index.js";
import { initializeDatabase } from "./database/connection.js";

let app: any = null;
let dbInitialized = false;

async function getApp() {
  if (!app) {
    // Initialize database once
    if (!dbInitialized) {
      await initializeDatabase();
      dbInitialized = true;
      console.log("✅ Netlify function database initialized");
    }

    app = createServer();
    console.log("✅ Netlify function app created");
  }
  return app;
}

export const handler = async (event: any, context: any) => {
  const app = await getApp();
  const serverlessHandler = serverless(app);
  return serverlessHandler(event, context);
};
