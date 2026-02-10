import { Request, Response, NextFunction } from "express";
import { adminAuth, adminDb } from "../config/firebase-admin.js";

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    name: string;
    email: string;
  };
}

/**
 * Middleware that verifies the Firebase ID token sent in the
 * Authorization header (Bearer <token>) and attaches the user
 * profile to `req.user`.
 */
export async function authenticateToken(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({ error: "Invalid authorization header format" });
      return;
    }

    const idToken = authHeader.split(" ")[1];

    if (!idToken) {
      res.status(401).json({ error: "Access token required" });
      return;
    }

    // Verify with Firebase Admin
    const decodedToken = await adminAuth.verifyIdToken(idToken);

    // Try to load the Firestore profile for richer data (name etc.)
    const profileDoc = await adminDb
      .collection("users")
      .doc(decodedToken.uid)
      .get();

    const profile = profileDoc.exists ? (profileDoc.data() as any) : null;

    req.user = {
      id: decodedToken.uid,
      name: profile?.name ?? decodedToken.name ?? "",
      email: decodedToken.email ?? "",
    };

    next();
  } catch (error) {
    console.warn(
      `Firebase auth failed from ${req.ip}:`,
      error instanceof Error ? error.message : "Unknown error",
    );

    res.status(403).json({ error: "Invalid or expired token" });
    return;
  }
}
