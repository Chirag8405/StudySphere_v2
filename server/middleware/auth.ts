import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../utils/jwt-secure.js";
import { UserModel } from "../models/User.js";
import DatabaseSecurity from "../utils/database-security.js";

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    name: string;
    email: string;
  };
}

export async function authenticateToken(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    // Validate authorization header format
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({ error: "Invalid authorization header format" });
      return;
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      res.status(401).json({ error: "Access token required" });
      return;
    }

    // Validate token format (basic check)
    if (token.length < 10 || !token.includes(".")) {
      res.status(401).json({ error: "Invalid token format" });
      return;
    }

    // Verify and decode token
    const decoded = verifyToken(token);

    // Validate user ID format
    if (!DatabaseSecurity.isValidUUID(decoded.userId)) {
      res.status(401).json({ error: "Invalid user ID format" });
      return;
    }

    // Use constant-time database lookup to prevent timing attacks
    const user = await DatabaseSecurity.constantTimeCompare(
      UserModel.findById(decoded.userId),
      100, // minimum 100ms delay
    );

    if (!user) {
      res.status(401).json({ error: "User not found" });
      return;
    }

    // Attach user to request
    req.user = {
      id: user.id,
      name: DatabaseSecurity.sanitizeInput(user.name),
      email: DatabaseSecurity.sanitizeInput(user.email),
    };

    // Log successful authentication (for security monitoring)
    if (process.env.NODE_ENV === "production") {
      console.log(`User authenticated: ${user.id} from ${req.ip}`);
    }

    next();
  } catch (error) {
    // Enhanced error logging for security monitoring
    console.warn(
      `Authentication failed from ${req.ip}:`,
      error instanceof Error ? error.message : "Unknown error",
    );

    res.status(403).json({ error: "Invalid or expired token" });
    return;
  }
}
