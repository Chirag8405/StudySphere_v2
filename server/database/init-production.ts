import { initializeDatabase } from "./connection";

export async function initializeProductionDatabase() {
  try {
    console.log("🚀 Initializing production database...");

    // Initialize database tables only (no demo data)
    await initializeDatabase();

    console.log("✅ Production database initialized successfully!");
    console.log("📝 Ready for user registration and data creation");

    return true;
  } catch (error) {
    console.error("❌ Error initializing production database:", error);
    throw error;
  }
}

// Check if this is the main module
const isMainModule = import.meta.url === `file://${process.argv[1]}`;

if (isMainModule) {
  initializeProductionDatabase()
    .then(() => {
      console.log("Production database initialization completed");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Production database initialization failed:", error);
      process.exit(1);
    });
}
