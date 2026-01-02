import { createServer } from "./index.js";
import { initializeDatabase } from "./database/connection.js";

// Initialize database and create app for Netlify Functions
let app: any = null;
let dbInitialized = false;

async function getApp() {
  if (!dbInitialized) {
    try {
      console.log("🚀 Initializing StudySphere for Netlify...");

      // Initialize database for production (no seeding)
      await initializeDatabase();
      console.log("✅ Production database initialized");

      dbInitialized = true;
    } catch (error) {
      console.error("❌ Failed to initialize database:", error);
      throw error;
    }
  }

  if (!app) {
    // Create Express server
    app = createServer();
    console.log("✅ Express app created for Netlify Functions");
  }

  return app;
}

export default getApp;
