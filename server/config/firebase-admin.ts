import admin from "firebase-admin";

// Initialize Firebase Admin SDK
// In production, set FIREBASE_SERVICE_ACCOUNT_KEY env var with the JSON string
// of your service account key, or deploy to a Google Cloud environment with
// Application Default Credentials.
function initFirebaseAdmin() {
  if (admin.apps.length > 0) {
    return admin.apps[0]!;
  }

  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

  if (serviceAccountJson) {
    try {
      // Handle escaped newlines that some hosting platforms inject
      const cleaned = serviceAccountJson.includes("\\n")
        ? serviceAccountJson.replace(/\\n/g, "\n")
        : serviceAccountJson;
      const serviceAccount = JSON.parse(cleaned);
      return admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    } catch (err) {
      console.error(
        "Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY:",
        (err as Error).message,
      );
      console.error(
        "Make sure the env var contains the full JSON of your service-account key.",
      );
      throw err;
    }
  }

  // Fall back to Application Default Credentials (works on GCP, Firebase
  // hosting, or when GOOGLE_APPLICATION_CREDENTIALS env is set to the path of
  // the service account JSON file)
  console.warn(
    "FIREBASE_SERVICE_ACCOUNT_KEY not set — falling back to Application Default Credentials.",
  );
  return admin.initializeApp();
}

let _app: admin.app.App | null = null;
let _auth: admin.auth.Auth | null = null;
let _db: FirebaseFirestore.Firestore | null = null;

function getApp() {
  if (!_app) {
    _app = initFirebaseAdmin()!;
  }
  return _app;
}

export function getAdminAuth() {
  if (!_auth) _auth = getApp().auth();
  return _auth;
}

export function getAdminDb() {
  if (!_db) _db = getApp().firestore();
  return _db;
}

// Keep backward-compatible named exports that lazily initialize
export const adminAuth = new Proxy({} as admin.auth.Auth, {
  get(_target, prop) {
    return (getAdminAuth() as any)[prop];
  },
});

export const adminDb = new Proxy({} as FirebaseFirestore.Firestore, {
  get(_target, prop) {
    return (getAdminDb() as any)[prop];
  },
});

export default { getApp, getAdminAuth, getAdminDb };
