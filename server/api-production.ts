import { createServer } from "./index.js";
import { initializeDatabase } from "./database/connection.js";

const PORT = process.env.PORT || 8080;

async function startProductionApiServer() {
  try {
    console.log("🚀 Starting StudySphere Production API server...");

    // Initialize database for production (no seeding)
    await initializeDatabase();
    console.log("✅ Production database initialized");

    // Create and start Express server
    const app = createServer();

    app.listen(PORT, () => {
      console.log(`✅ Production API server running on port ${PORT}`);
      console.log(`🌐 API endpoints available at http://localhost:${PORT}/api`);
      console.log("🔐 Ready for user registration and login");
    });
  } catch (error) {
    console.error("❌ Failed to start production API server:", error);
    process.exit(1);
  }
}

startProductionApiServer();
