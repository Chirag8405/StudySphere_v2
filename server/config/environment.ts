export interface EnvironmentConfig {
  nodeEnv: string;
  port: number;
  corsOrigins: string[];
  allowedHosts: string[];
  maxRequestSize: string;
}

// Validate required environment variables
function validateEnvironment(): void {
  if (!process.env.NODE_ENV) {
    process.env.NODE_ENV = "development";
  }
}

// Validate origin format
function isValidOrigin(origin: string): boolean {
  try {
    const url = new URL(origin);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

// Parse CORS origins from environment
function parseCorsOrigins(): string[] {
  const corsOrigins = process.env.CORS_ORIGINS;

  if (!corsOrigins) {
    if (process.env.NODE_ENV === "development") {
      return ["http://localhost:8080", "http://localhost:3000"];
    }
    // In production, warn but don't crash — allow requests from any origin
    // until the deployer sets CORS_ORIGINS.
    console.warn(
      "CORS_ORIGINS not set — defaulting to '*'. Set CORS_ORIGINS to your domain for security.",
    );
    return ["*"];
  }

  const origins = corsOrigins.split(",").map((origin) => origin.trim());

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

validateEnvironment();

export const config: EnvironmentConfig = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: parseInt(process.env.PORT || "3000", 10),
  corsOrigins: parseCorsOrigins(),
  allowedHosts: parseAllowedHosts(),
  maxRequestSize: process.env.MAX_REQUEST_SIZE || "10mb",
};

if (config.nodeEnv === "production") {
  console.log("🔒 Production environment detected - security mode enabled");

  if (config.corsOrigins.includes("*")) {
    throw new Error("Wildcard CORS origins not allowed in production");
  }
}

export default config;
