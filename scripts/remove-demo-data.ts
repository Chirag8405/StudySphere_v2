import { getDatabase } from "../server/database/connection";

export async function removeDemoData() {
  try {
    console.log("🧹 Removing demo data from database...");

    const db = await getDatabase();

    // Remove demo user and all associated data
    const demoEmail = "demo@studysphere.com";

    // Find demo user
    const demoUser = await db.get("SELECT id FROM users WHERE email = ?", [
      demoEmail,
    ]);

    if (demoUser) {
      console.log(`Found demo user with ID: ${demoUser.id}`);

      // Delete user (CASCADE will handle related data)
      await db.run("DELETE FROM users WHERE id = ?", [demoUser.id]);

      console.log("✅ Demo user and all associated data removed");
    } else {
      console.log("ℹ���  No demo user found");
    }

    // Verify removal
    const remainingUsers = await db.all("SELECT email FROM users");
    console.log(`📊 Remaining users in database: ${remainingUsers.length}`);

    if (remainingUsers.length > 0) {
      console.log("Users:", remainingUsers.map((u) => u.email).join(", "));
    }

    console.log("✅ Demo data removal completed successfully!");
    return true;
  } catch (error) {
    console.error("❌ Error removing demo data:", error);
    throw error;
  }
}

// Check if this is the main module
const isMainModule = import.meta.url === `file://${process.argv[1]}`;

if (isMainModule) {
  removeDemoData()
    .then(() => {
      console.log("Demo data removal completed");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Demo data removal failed:", error);
      process.exit(1);
    });
}
