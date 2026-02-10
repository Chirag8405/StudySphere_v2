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
    const serviceAccount = JSON.parse(serviceAccountJson);
    return admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  }

  // Fall back to Application Default Credentials (works on GCP, Firebase
  // hosting, or when GOOGLE_APPLICATION_CREDENTIALS env is set to the path of
  // the service account JSON file)
  return admin.initializeApp();
}

const app = initFirebaseAdmin();
export const adminAuth = admin.auth();
export const adminDb = admin.firestore();

export default app;
