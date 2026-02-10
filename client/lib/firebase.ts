import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

// These values are safe to expose in client-side code – they only identify your
// Firebase project. Security is enforced by Firebase Security Rules and the
// Admin SDK on the server.
//
// Replace the placeholder values below with your actual Firebase project config.
// You can find them in the Firebase Console → Project Settings → General →
// Your apps → Firebase SDK snippet → Config.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? "",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? "",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? "",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID ?? "",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

export default app;
