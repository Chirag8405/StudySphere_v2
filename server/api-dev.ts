import { createServer } from "./index.js";
import { initializeDatabase } from "./database/connection.js";

const PORT = process.env.PORT || 3000;

async function startApiServer() {
  try {
    console.log("🚀 Starting StudySphere API server...");

    // Initialize database
    await initializeDatabase();
    console.log("✅ Database initialized");

    // Create and start Express server
    const app = createServer();

    app.listen(PORT, () => {
      console.log(`✅ API server running on port ${PORT}`);
      console.log(`🌐 API endpoints available at http://localhost:${PORT}/api`);
      console.log(`🔐 Ready for user registration and login`);
    });
  } catch (error) {
    console.error("❌ Failed to start API server:", error);
    process.exit(1);
  }
}

startApiServer();
