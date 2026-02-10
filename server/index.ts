import express from "express";
import cors from "cors";
import { initializeDatabase } from "./database/connection.js";
import { authenticateToken } from "./middleware/auth.js";
import config from "./config/environment.js";
import {
  securityHeaders,
  apiRateLimit,
  sensitiveRateLimit,
  handleValidationErrors,
  sanitizeRequest,
  errorLogger,
  ipMonitoring,
  validateLecture,
  validateAssignment,
  validateAttendance,
  validateUpdateAttendance,
  validateId,
  validateProfileCreation,
} from "./middleware/security.js";

// Route imports
import { register, getProfile } from "./routes/auth.js";
import {
  getLectures,
  getLecture,
  createLecture,
  updateLecture,
  deleteLecture,
} from "./routes/lectures.js";
import {
  getAttendance,
  getAttendanceStats,
  getWeeklyAttendance,
  createAttendance,
  updateAttendance,
  deleteAttendance,
} from "./routes/attendance.js";
import {
  getAssignments,
  getAssignment,
  getAssignmentStats,
  createAssignment,
  updateAssignment,
  deleteAssignment,
  patchAssignmentStatus,
  markOverdueAssignments,
} from "./routes/assignments.js";
import { getDashboardData } from "./routes/dashboard.js";

export function createServer() {
  const app = express();

  // Initialize Firestore (no-op, but keeps the startup sequence consistent)
  initializeDatabase().catch((error) => {
    console.error("Failed to initialize database:", error);
  });

  // Trust proxy (for proper IP detection behind reverse proxy)
  app.set("trust proxy", 1);

  // Security middleware (applied first)
  app.use(securityHeaders);
  app.use(ipMonitoring);

  // CORS configuration with restricted origins
  app.use(
    cors({
      origin: config.corsOrigins,
      methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
      allowedHeaders: ["Content-Type", "Authorization"],
      credentials: true,
      maxAge: 86400, // 24 hours
    }),
  );

  // Request parsing with size limits
  app.use(express.json({ limit: config.maxRequestSize }));
  app.use(express.urlencoded({ extended: true, limit: config.maxRequestSize }));

  // Request sanitization
  app.use(sanitizeRequest);

  // Global rate limiting
  app.use("/api", apiRateLimit);

  // Health check
  app.get("/api/ping", (_req, res) => {
    res.json({
      message: "StudySphere API is running!",
      version: "1.0.0",
      environment: config.nodeEnv,
      timestamp: new Date().toISOString(),
    });
  });

  // Auth routes – register creates Firestore profile (requires Firebase token),
  // profile returns current user info
  app.post(
    "/api/auth/register",
    authenticateToken,
    validateProfileCreation,
    handleValidationErrors,
    register,
  );

  app.get("/api/auth/profile", authenticateToken, getProfile);

  // Dashboard route (protected)
  app.get("/api/dashboard", authenticateToken, getDashboardData);

  // Lecture routes (protected) with validation
  app.get("/api/lectures", authenticateToken, getLectures);
  app.get(
    "/api/lectures/:id",
    authenticateToken,
    validateId,
    handleValidationErrors,
    getLecture,
  );
  app.post(
    "/api/lectures",
    authenticateToken,
    validateLecture,
    handleValidationErrors,
    createLecture,
  );
  app.put(
    "/api/lectures/:id",
    authenticateToken,
    validateId,
    validateLecture,
    handleValidationErrors,
    updateLecture,
  );
  app.delete(
    "/api/lectures/:id",
    authenticateToken,
    validateId,
    handleValidationErrors,
    deleteLecture,
  );

  // Attendance routes (protected) with validation
  app.get("/api/attendance", authenticateToken, getAttendance);
  app.get("/api/attendance/stats", authenticateToken, getAttendanceStats);
  app.get("/api/attendance/weekly", authenticateToken, getWeeklyAttendance);
  app.post(
    "/api/attendance",
    authenticateToken,
    validateAttendance,
    handleValidationErrors,
    createAttendance,
  );
  app.put(
    "/api/attendance/:id",
    authenticateToken,
    validateId,
    validateUpdateAttendance,
    handleValidationErrors,
    updateAttendance,
  );
  app.delete(
    "/api/attendance/:id",
    authenticateToken,
    validateId,
    handleValidationErrors,
    deleteAttendance,
  );

  // Assignment routes (protected) with validation
  app.get("/api/assignments", authenticateToken, getAssignments);
  app.get("/api/assignments/stats", authenticateToken, getAssignmentStats);
  app.get(
    "/api/assignments/:id",
    authenticateToken,
    validateId,
    handleValidationErrors,
    getAssignment,
  );
  app.post(
    "/api/assignments",
    authenticateToken,
    validateAssignment,
    handleValidationErrors,
    createAssignment,
  );
  app.put(
    "/api/assignments/:id",
    authenticateToken,
    validateId,
    handleValidationErrors,
    updateAssignment,
  );
  app.patch(
    "/api/assignments/:id/status",
    authenticateToken,
    validateId,
    handleValidationErrors,
    patchAssignmentStatus,
  );
  app.delete(
    "/api/assignments/:id",
    authenticateToken,
    validateId,
    handleValidationErrors,
    deleteAssignment,
  );
  app.post(
    "/api/assignments/mark-overdue",
    authenticateToken,
    sensitiveRateLimit,
    markOverdueAssignments,
  );

  // 404 handler for undefined routes
  app.use("*", (req, res) => {
    res.status(404).json({
      error: "Endpoint not found",
      path: req.originalUrl,
      method: req.method,
    });
  });

  // Global error handling middleware
  app.use(errorLogger);

  return app;
}
