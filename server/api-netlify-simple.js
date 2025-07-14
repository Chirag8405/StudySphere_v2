const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const { body, validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");

// Environment variables
const JWT_SECRET =
  process.env.JWT_SECRET ||
  "test-jwt-secret-for-local-development-only-64-characters-long-minimum";
const DATABASE_PATH = process.env.DATABASE_PATH || "./studysphere-local.db";
const CORS_ORIGIN = process.env.CORS_ORIGIN || "http://localhost:8888";

// Initialize database
function initDatabase() {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(DATABASE_PATH, (err) => {
      if (err) {
        reject(err);
        return;
      }

      // Create tables
      db.serialize(() => {
        // Users table
        db.run(`CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          email TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          name TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Lectures table
        db.run(`CREATE TABLE IF NOT EXISTS lectures (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          subject TEXT NOT NULL,
          date TEXT NOT NULL,
          time TEXT NOT NULL,
          attendance_status TEXT DEFAULT 'pending',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users (id)
        )`);

        // Assignments table
        db.run(`CREATE TABLE IF NOT EXISTS assignments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          title TEXT NOT NULL,
          description TEXT,
          due_date TEXT NOT NULL,
          priority TEXT DEFAULT 'medium',
          status TEXT DEFAULT 'pending',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users (id)
        )`);

        resolve(db);
      });
    });
  });
}

// Create Express app
function createApp() {
  const app = express();

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
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
  });
  app.use(limiter);

  // Body parsing
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true, limit: "10mb" }));

  // Authentication middleware
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

  // API Routes
  app.post(
    "/api/auth/register",
    [
      body("email").isEmail().normalizeEmail(),
      body("password").isLength({ min: 6 }),
      body("name").isLength({ min: 1 }).trim(),
    ],
    async (req, res) => {
      try {
        console.log("Register request body:", req.body);
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          console.log("Registration validation errors:", errors.array());
          return res.status(400).json({ errors: errors.array() });
        }

        const { email, password, name } = req.body;
        const db = await initDatabase();

        // Check if user exists
        db.get(
          "SELECT id FROM users WHERE email = ?",
          [email],
          async (err, row) => {
            if (err) {
              return res.status(500).json({ error: "Database error" });
            }
            if (row) {
              return res.status(400).json({ error: "User already exists" });
            }

            // Hash password and create user
            const hashedPassword = await bcrypt.hash(password, 12);
            db.run(
              "INSERT INTO users (email, password, name) VALUES (?, ?, ?)",
              [email, hashedPassword, name],
              function (err) {
                if (err) {
                  return res
                    .status(500)
                    .json({ error: "Failed to create user" });
                }

                const token = jwt.sign(
                  { userId: this.lastID, email },
                  JWT_SECRET,
                  { expiresIn: "24h" },
                );
                res.json({
                  token,
                  user: { id: this.lastID, email, name },
                });
              },
            );
          },
        );
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
        console.log("Login request body:", req.body);
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          console.log("Login validation errors:", errors.array());
          return res.status(400).json({ errors: errors.array() });
        }

        const { email, password } = req.body;
        const db = await initDatabase();

        db.get(
          "SELECT * FROM users WHERE email = ?",
          [email],
          async (err, user) => {
            if (err) {
              return res.status(500).json({ error: "Database error" });
            }
            if (!user) {
              return res.status(400).json({ error: "Invalid credentials" });
            }

            const validPassword = await bcrypt.compare(password, user.password);
            if (!validPassword) {
              return res.status(400).json({ error: "Invalid credentials" });
            }

            const token = jwt.sign({ userId: user.id, email }, JWT_SECRET, {
              expiresIn: "24h",
            });
            res.json({
              token,
              user: { id: user.id, email: user.email, name: user.name },
            });
          },
        );
      } catch (error) {
        res.status(500).json({ error: "Server error" });
      }
    },
  );

  // Protected routes
  app.get("/api/lectures", authenticateToken, async (req, res) => {
    try {
      const db = await initDatabase();
      db.all(
        "SELECT * FROM lectures WHERE user_id = ? ORDER BY date DESC, time DESC",
        [req.user.userId],
        (err, lectures) => {
          if (err) {
            return res.status(500).json({ error: "Database error" });
          }
          res.json(lectures);
        },
      );
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  app.get("/api/assignments", authenticateToken, async (req, res) => {
    try {
      const db = await initDatabase();
      db.all(
        "SELECT * FROM assignments WHERE user_id = ? ORDER BY due_date ASC",
        [req.user.userId],
        (err, assignments) => {
          if (err) {
            return res.status(500).json({ error: "Database error" });
          }
          res.json(assignments);
        },
      );
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "OK", timestamp: new Date().toISOString() });
  });

  return app;
}

let app = null;

async function getApp() {
  if (!app) {
    app = createApp();
    await initDatabase();
    console.log("✅ Netlify function app initialized");
  }
  return app;
}

module.exports = getApp;
