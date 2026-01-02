import crypto from "crypto";

export interface EnvironmentConfig {
  nodeEnv: string;
  port: number;
  jwtSecret: string;
  jwtExpiresIn: string;
  databasePath: string;
  corsOrigins: string[];
  allowedHosts: string[];
  maxRequestSize: string;
  bcryptRounds: number;
  sessionTimeout: number;
}

// Validate required environment variables
function validateEnvironment(): void {
  // Default NODE_ENV to 'development' if not set
  if (!process.env.NODE_ENV) {
    process.env.NODE_ENV = "development";
  }

  // Validate JWT secret in production
  if (process.env.NODE_ENV === "production") {
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
      throw new Error(
        "JWT_SECRET must be at least 32 characters long in production",
      );
    }
  }
}

// Generate secure JWT secret if not provided
function generateSecureSecret(): string {
  if (process.env.JWT_SECRET) {
    return process.env.JWT_SECRET;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "JWT_SECRET environment variable is required in production",
    );
  }

  // Generate a secure random secret for development
  return crypto.randomBytes(64).toString("hex");
}

// Validate origin format
function isValidOrigin(origin: string): boolean {
  try {
    const url = new URL(origin);
    // Only allow http and https protocols
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

// Parse CORS origins from environment
function parseCorsOrigins(): string[] {
  const corsOrigins = process.env.CORS_ORIGINS;

  if (!corsOrigins) {
    // Default to localhost for development
    if (process.env.NODE_ENV === "development") {
      return ["http://localhost:8080", "http://localhost:3000"];
    }
    // In production, require explicit CORS origins
    throw new Error(
      "CORS_ORIGINS environment variable is required in production",
    );
  }

  const origins = corsOrigins.split(",").map((origin) => origin.trim());
  
  // Validate each origin
  for (const origin of origins) {
    if (origin !== "*" && !isValidOrigin(origin)) {
      throw new Error(`Invalid CORS origin format: ${origin}`);
    }
  }
  
  return origins;
}

// Parse allowed hosts
function parseAllowedHosts(): string[] {
  const allowedHosts = process.env.ALLOWED_HOSTS;

  if (!allowedHosts) {
    if (process.env.NODE_ENV === "development") {
      return ["localhost", "127.0.0.1"];
    }
    return [];
  }

  return allowedHosts.split(",").map((host) => host.trim());
}

// Initialize and validate environment configuration
validateEnvironment();

export const config: EnvironmentConfig = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: parseInt(process.env.PORT || "3000", 10),
  jwtSecret: generateSecureSecret(),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  databasePath: process.env.DATABASE_PATH || "./studysphere.db",
  corsOrigins: parseCorsOrigins(),
  allowedHosts: parseAllowedHosts(),
  maxRequestSize: process.env.MAX_REQUEST_SIZE || "10mb",
  bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || "12", 10),
  sessionTimeout: parseInt(process.env.SESSION_TIMEOUT || "604800", 10), // 7 days in seconds
};

// Security validation
if (config.bcryptRounds < 10) {
  throw new Error("BCRYPT_ROUNDS must be at least 10 for security");
}

if (config.nodeEnv === "production") {
  console.log("🔒 Production environment detected - security mode enabled");

  // Additional production checks
  if (config.corsOrigins.includes("*")) {
    throw new Error("Wildcard CORS origins not allowed in production");
  }

  if (config.jwtSecret.length < 32) {
    throw new Error("JWT_SECRET too weak for production use");
  }
}

export default config;
