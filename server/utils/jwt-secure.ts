import jwt, { Secret, SignOptions} from "jsonwebtoken";
import crypto from "crypto";
import config from "../config/environment.ts";

export interface JwtPayload {
  userId: string;
  email: string;
  iat?: number;
  exp?: number;
  jti?: string; // JWT ID for token tracking/revocation
}

const secret: Secret = config.jwtSecret;
// Token blacklist for revoked tokens (in production, use Redis)
const revokedTokens = new Set<string>();

// Track token usage to detect replay attacks
const tokenUsage = new Map<string, { count: number; lastUsed: number }>();

export function generateToken(
  payload: Omit<JwtPayload, "iat" | "exp" | "jti">,
): string {
  // Generate unique JWT ID
  const jti = crypto.randomUUID();

  const tokenPayload: JwtPayload = {
    ...payload,
    jti,
  };

  return jwt.sign(tokenPayload, secret as Secret, {
    expiresIn: config.jwtExpiresIn,
    algorithm: "HS256",
    issuer: "studysphere",
    audience: "studysphere-users",
  }as SignOptions
   );
}

export function verifyToken(token: string): JwtPayload {
  try {
    // Check if token is revoked
    if (revokedTokens.has(token)) {
      throw new Error("Token has been revoked");
    }

    const decoded = jwt.verify(token, config.jwtSecret, {
      algorithms: ["HS256"],
      issuer: "studysphere",
      audience: "studysphere-users",
    }) as JwtPayload;

    // Track token usage for security monitoring
    if (decoded.jti) {
      const usage = tokenUsage.get(decoded.jti) || { count: 0, lastUsed: 0 };
      usage.count++;
      usage.lastUsed = Date.now();
      tokenUsage.set(decoded.jti, usage);

      // Flag suspicious activity (too many rapid uses)
      if (usage.count > 100) {
        console.warn(`Suspicious token usage detected: ${decoded.jti}`);
      }
    }

    return decoded;
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error("Invalid token");
    }
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error("Token expired");
    }
    if (error instanceof jwt.NotBeforeError) {
      throw new Error("Token not active");
    }
    throw error;
  }
}

export function refreshToken(oldToken: string): string {
  try {
    const decoded = verifyToken(oldToken);

    // Revoke old token
    revokeToken(oldToken);

    // Generate new token with same payload (minus JWT-specific fields)
    return generateToken({
      userId: decoded.userId,
      email: decoded.email,
    });
  } catch (error) {
    throw new Error("Cannot refresh invalid token");
  }
}

export function revokeToken(token: string): void {
  revokedTokens.add(token);

  // Extract JTI for cleanup
  try {
    const decoded = jwt.decode(token) as JwtPayload;
    if (decoded?.jti) {
      tokenUsage.delete(decoded.jti);
    }
  } catch {
    // Ignore decode errors when revoking
  }
}

export function isTokenRevoked(token: string): boolean {
  return revokedTokens.has(token);
}

// Cleanup expired tokens periodically (call this in a scheduled job)
export function cleanupExpiredTokens(): void {
  const now = Date.now();
  const oneHour = 60 * 60 * 1000;

  // Clean up token usage tracking for old tokens
  for (const [jti, usage] of tokenUsage.entries()) {
    if (now - usage.lastUsed > oneHour) {
      tokenUsage.delete(jti);
    }
  }

  // In production, implement proper cleanup for revoked tokens
  // This simple implementation will grow indefinitely
  console.log(`Token cleanup: ${tokenUsage.size} active tokens`);
}

// Initialize cleanup interval
setInterval(cleanupExpiredTokens, 60 * 60 * 1000); // Every hour
