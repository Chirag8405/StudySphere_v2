import { createServer } from "./index.js";
import { initializeDatabase } from "./database/connection.js";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 8080;

async function startServer() {
  try {
    console.log("🚀 Starting StudySphere production server...");

    // Initialize database (without seeding)
    await initializeDatabase();
    console.log("✅ Database initialized");

    // Create API server
    const app = createServer();

    // Serve static files from the spa build
    const staticPath = path.join(__dirname, "../spa");
    app.use(express.static(staticPath));

    // Handle client-side routing - serve index.html for all non-API routes
    app.get("*", (req, res) => {
      if (req.path.startsWith("/api/")) {
        res.status(404).json({ error: "API endpoint not found" });
      } else {
        res.sendFile(path.join(staticPath, "index.html"));
      }
    });

    app.listen(PORT, () => {
      console.log(`✅ Production server running on port ${PORT}`);
      console.log(`🌐 Application available at http://localhost:${PORT}`);
      console.log("🔐 Ready for user registration and login");
    });
  } catch (error) {
    console.error("❌ Failed to start production server:", error);
    process.exit(1);
  }
}

startServer();
