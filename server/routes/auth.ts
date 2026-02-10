import { Request, Response } from "express";
import { adminDb } from "../config/firebase-admin.js";
import { AuthenticatedRequest } from "../middleware/auth.js";

interface RegisterRequest {
  name: string;
  email: string;
}

/**
 * Called by the client right after `createUserWithEmailAndPassword` succeeds
 * on the client-side.  The Firebase ID token is already in the Authorization
 * header and gets verified by the `authenticateToken` middleware, so we know
 * `req.user` is set.  All we need to do here is create the Firestore profile
 * document.
 */
export async function register(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const { name, email } = req.body as RegisterRequest;
    const now = new Date().toISOString();

    const profile = {
      id: req.user.id,
      name: name || req.user.name,
      email: email || req.user.email,
      created_at: now,
      updated_at: now,
    };

    await adminDb.collection("users").doc(req.user.id).set(profile, { merge: true });

    res.status(201).json({ user: profile });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function getProfile(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    res.json({ user: req.user });
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

