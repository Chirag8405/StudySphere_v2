import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { body, validationResult } from "express-validator";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import {
  initializeTursoDatabase,
  dbGet,
  dbAll,
  dbRun,
} from "./database/turso-client.js";

// Environment variables
const JWT_SECRET =
  process.env.JWT_SECRET ||
  "test-jwt-secret-for-local-development-only-64-characters-long-minimum";
const CORS_ORIGIN = process.env.CORS_ORIGIN || "http://localhost:8888";

let initialized = false;

function createApp() {
  const app = express();

  app.set("trust proxy", true);

  // Security middleware
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
    }),
  );

  // CORS
  app.use(
    cors({
      origin: CORS_ORIGIN,
      credentials: true,
    }),
  );

  // Rate limiting
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
  });
  app.use(limiter);

  // Body parsing
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true, limit: "10mb" }));

  const authenticateToken = (req, res, next) => {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({ error: "Access token required" });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
      if (err) {
        return res.status(403).json({ error: "Invalid or expired token" });
      }
      req.user = user;
      next();
    });
  };

  // Routes...

  app.get("/api/health", (req, res) => {
    res.json({
      status: "OK",
      database: "Turso",
      timestamp: new Date().toISOString(),
    });
  });

  app.post(
    "/api/auth/register",
    [
      body("email").isEmail().normalizeEmail(),
      body("password").isLength({ min: 6 }),
      body("name").isLength({ min: 1 }).trim(),
    ],
    async (req, res) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({ errors: errors.array() });
        }

        const { email, password, name } = req.body;
        const existingUser = await dbGet("SELECT id FROM users WHERE email = ?", [email]);

        if (existingUser) {
          return res.status(400).json({ error: "User already exists" });
        }

        const hashedPassword = await bcrypt.hash(password, 12);
        const result = await dbRun(
          "INSERT INTO users (email, password, name) VALUES (?, ?, ?)",
          [email, hashedPassword, name],
        );

        const userId = result.lastInsertRowid;
        const token = jwt.sign({ userId, email }, JWT_SECRET, {
          expiresIn: "24h",
        });

        res.json({
          token,
          user: { id: userId, email, name },
        });
      } catch (error) {
        res.status(500).json({ error: "Server error" });
      }
    },
  );

  app.post(
    "/api/auth/login",
    [body("email").isEmail().normalizeEmail(), body("password").exists()],
    async (req, res) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({ errors: errors.array() });
        }

        const { email, password } = req.body;
        const user = await dbGet("SELECT * FROM users WHERE email = ?", [email]);

        if (!user || !(await bcrypt.compare(password, user.password))) {
          return res.status(400).json({ error: "Invalid credentials" });
        }

        const token = jwt.sign({ userId: user.id, email }, JWT_SECRET, {
          expiresIn: "24h",
        });

        res.json({
          token,
          user: { id: user.id, email: user.email, name: user.name },
        });
      } catch (error) {
        res.status(500).json({ error: "Server error" });
      }
    },
  );

  app.get("/api/lectures", authenticateToken, async (req, res) => {
    try {
      const lectures = await dbAll(
        "SELECT * FROM lectures WHERE user_id = ? ORDER BY date DESC, time DESC",
        [req.user.userId],
      );
      res.json(lectures);
    } catch {
      res.status(500).json({ error: "Server error" });
    }
  });

  app.post(
    "/api/lectures",
    [
      authenticateToken,
      body("subject").isLength({ min: 1 }).trim(),
      body("date").isISO8601(),
      body("time").matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
    ],
    async (req, res) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({ errors: errors.array() });
        }

        const { subject, date, time } = req.body;
        const result = await dbRun(
          "INSERT INTO lectures (user_id, subject, date, time) VALUES (?, ?, ?, ?)",
          [req.user.userId, subject, date, time],
        );

        const lecture = await dbGet("SELECT * FROM lectures WHERE id = ?", [
          result.lastInsertRowid,
        ]);

        res.status(201).json(lecture);
      } catch {
        res.status(500).json({ error: "Server error" });
      }
    },
  );

  app.put("/api/lectures/:id", authenticateToken, async (req, res) => {
    try {
      const { id } = req.params;
      const { attendance_status } = req.body;

      await dbRun(
        "UPDATE lectures SET attendance_status = ? WHERE id = ? AND user_id = ?",
        [attendance_status, id, req.user.userId],
      );

      const lecture = await dbGet(
        "SELECT * FROM lectures WHERE id = ? AND user_id = ?",
        [id, req.user.userId],
      );

      if (!lecture) {
        return res.status(404).json({ error: "Lecture not found" });
      }

      res.json(lecture);
    } catch {
      res.status(500).json({ error: "Server error" });
    }
  });

  app.get("/api/assignments", authenticateToken, async (req, res) => {
    try {
      const assignments = await dbAll(
        "SELECT * FROM assignments WHERE user_id = ? ORDER BY due_date ASC",
        [req.user.userId],
      );
      res.json(assignments);
    } catch {
      res.status(500).json({ error: "Server error" });
    }
  });

  app.post(
    "/api/assignments",
    [
      authenticateToken,
      body("title").isLength({ min: 1 }).trim(),
      body("due_date").isISO8601(),
    ],
    async (req, res) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({ errors: errors.array() });
        }

        const { title, description, due_date, priority = "medium" } = req.body;
        const result = await dbRun(
          "INSERT INTO assignments (user_id, title, description, due_date, priority) VALUES (?, ?, ?, ?, ?)",
          [req.user.userId, title, description, due_date, priority],
        );

        const assignment = await dbGet(
          "SELECT * FROM assignments WHERE id = ?",
          [result.lastInsertRowid],
        );

        res.status(201).json(assignment);
      } catch {
        res.status(500).json({ error: "Server error" });
      }
    },
  );

  return app;
}

let app = null;

export async function getApp() {
  if (!initialized) {
    try {
      console.log("🚀 Initializing Turso database...");
      await initializeTursoDatabase();
      initialized = true;
    } catch (error) {
      console.error("❌ Failed to initialize database:", error);
      throw error;
    }
  }

  if (!app) {
    app = createApp();
    console.log("✅ Express app created with Turso support");
  }

  return app;
}
