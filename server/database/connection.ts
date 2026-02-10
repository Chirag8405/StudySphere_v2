import { adminDb } from "../config/firebase-admin.js";

// ──────────────────────────────────────────────
// Firestore database connection helper
// ──────────────────────────────────────────────

/** Returns the Firestore instance configured by firebase-admin. */
export function getDatabase() {
  return adminDb;
}

/** No-op for Firestore – collections/documents are created on the fly. */
export async function initializeDatabase(): Promise<void> {
  // Firestore doesn't need explicit table creation.
  // Collections and documents are created automatically.
  console.log("✅ Firestore database ready");
}
