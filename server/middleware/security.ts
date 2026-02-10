import { Request, Response, NextFunction } from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { body, validationResult, param, query } from "express-validator";

// Rate limiting configurations
export const createRateLimit = (
  windowMs: number,
  max: number,
  message: string,
) => {
  return rateLimit({
    windowMs,
    max,
    message: { error: message },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      res.status(429).json({
        error: message,
        retryAfter: Math.round(windowMs / 1000),
      });
    },
  });
};

// General API rate limiting
export const apiRateLimit = createRateLimit(
  1 * 60 * 1000, // 1 minute
  100, // 100 requests per minute
  "Too many requests. Please slow down.",
);

// Aggressive rate limiting for password reset/sensitive operations
export const sensitiveRateLimit = createRateLimit(
  60 * 60 * 1000, // 1 hour
  3, // 3 attempts
  "Too many sensitive operations. Please try again later.",
);

// Security headers middleware
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", "https://*.googleapis.com", "https://*.firebaseio.com", "wss://*.firebaseio.com", "https://identitytoolkit.googleapis.com", "https://securetoken.googleapis.com"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false, // For compatibility
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
});

// Input validation schemas
export const validateProfileCreation = [
  body("name")
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("Name must be between 2 and 50 characters")
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage("Name must contain only letters and spaces"),
  body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Must be a valid email")
    .isLength({ max: 254 })
    .withMessage("Email too long"),
];

export const validateLecture = [
  body("name")
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage("Lecture name must be between 1 and 100 characters")
    .escape(),
  body("schedule_days")
    .isArray({ min: 1, max: 7 })
    .withMessage("Must select at least one day")
    .custom((days) => {
      const validDays = [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday",
      ];
      return days.every((day: string) => validDays.includes(day));
    })
    .withMessage("Invalid day selected"),
  body("schedule_time")
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage("Invalid time format (HH:MM)"),
];

export const validateAssignment = [
  body("title")
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage("Title must be between 1 and 200 characters")
    .escape(),
  body("subject")
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage("Subject must be between 1 and 100 characters")
    .escape(),
  body("description")
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage("Description cannot exceed 1000 characters")
    .escape(),
  body("due_date").isISO8601().withMessage("Invalid date format"),
  body("priority")
    .optional()
    .isIn(["low", "medium", "high"])
    .withMessage("Priority must be low, medium, or high"),
];

export const validateAttendance = [
  body("lecture_id")
    .isString()
    .trim()
    .isLength({ min: 1, max: 128 })
    .withMessage("Invalid lecture ID"),
  body("date").isISO8601().withMessage("Invalid date format"),
  body("status")
    .isIn(["present", "absent", "cancelled"])
    .withMessage("Status must be present, absent, or cancelled"),
];

export const validateUpdateAttendance = [
  body("status")
    .isIn(["present", "absent", "cancelled"])
    .withMessage("Status must be present, absent, or cancelled"),
];

export const validateId = [
  param("id")
    .isString()
    .trim()
    .isLength({ min: 1, max: 128 })
    .withMessage("Invalid ID format"),
];

// Validation error handler
export const handleValidationErrors = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: "Validation failed",
      details: errors.array().map((error) => ({
        field: error.type === "field" ? error.path : "unknown",
        message: error.msg,
      })),
    });
  }
  next();
};

// Request sanitization middleware
export const sanitizeRequest = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  // Remove any null bytes that could cause issues
  const sanitizeObject = (obj: any): any => {
    if (typeof obj === "string") {
      return obj.replace(/\0/g, "");
    }
    if (typeof obj === "object" && obj !== null) {
      for (const key in obj) {
        obj[key] = sanitizeObject(obj[key]);
      }
    }
    return obj;
  };

  if (req.body) {
    req.body = sanitizeObject(req.body);
  }
  if (req.query) {
    req.query = sanitizeObject(req.query);
  }
  if (req.params) {
    req.params = sanitizeObject(req.params);
  }

  next();
};

// Error logging middleware (for production)
export const errorLogger = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  // Log error details (in production, send to logging service)
  console.error(`[${new Date().toISOString()}] Error:`, {
    message: err.message,
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get("User-Agent"),
  });

  // Don't expose stack traces in production
  const isDevelopment = process.env.NODE_ENV === "development";

  res.status(500).json({
    error: "Internal server error",
    ...(isDevelopment && { details: err.message, stack: err.stack }),
  });
};

// IP-based blocking (simple implementation)
const suspiciousIPs = new Set<string>();
const ipAttempts = new Map<string, { count: number; lastAttempt: number }>();

export const ipMonitoring = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const clientIP = req.ip || req.connection.remoteAddress || "unknown";

  // Block known malicious IPs
  if (suspiciousIPs.has(clientIP)) {
    return res.status(403).json({ error: "Access denied" });
  }

  // Track auth attempts using response finish event
  if (req.path.includes("/auth/register")) {
    res.on("finish", () => {
      // Only track failed auth attempts (401, 403)
      if (res.statusCode === 401 || res.statusCode === 403) {
        const now = Date.now();
        const attempts = ipAttempts.get(clientIP) || { count: 0, lastAttempt: 0 };

        // Reset count if last attempt was more than an hour ago
        if (now - attempts.lastAttempt > 60 * 60 * 1000) {
          attempts.count = 0;
        }

        attempts.count++;
        attempts.lastAttempt = now;
        ipAttempts.set(clientIP, attempts);

        // Block IP after 10 failed attempts
        if (attempts.count >= 10) {
          suspiciousIPs.add(clientIP);
          console.warn(`Blocked suspicious IP after ${attempts.count} failed auth attempts: ${clientIP}`);
        }
      }
    });
  }

  next();
};
