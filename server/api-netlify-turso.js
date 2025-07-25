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
  const getIP = (req) => {
  return (
    req.headers["x-forwarded-for"]?.split(",")[0] ||
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress ||
    "127.0.0.1"
  );
};

// ✅ Rate limiter with safe IP getter
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getIP, // Safe fallback IP extraction
});

app.use(limiter);

// ✅ Body parsing
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// ✅ JWT auth middleware
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

  // GET /api/dashboard
  app.get("/api/dashboard", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    // Fetch all lectures
    const lectures = await dbAll(
      `SELECT 
         id,
         user_id,
         name,
         subject,
         date,
         time,
         attendance_status,
         created_at
       FROM lectures
       WHERE user_id = ?
       ORDER BY date ASC, time ASC`,
      [userId]
    );
    lectures.forEach((lecture) => {
  try {
    lecture.schedule_days = JSON.parse(lecture.date);
  } catch {
    lecture.schedule_days = [];
  }
  delete lecture.date; // optional: remove raw date string to avoid confusion
});

    // Calculate attendance stats manually
    const total = lectures.length;
    const present = lectures.filter((l) => l.attendance_status === "present").length;
    const attendance_percentage = total > 0 ? Math.round((present / total) * 100) : 0;

    // Weekly attendance stats
    const weeklyDataRaw = await dbAll(
      `SELECT 
         strftime('%w', date) AS dayNum,
         CASE strftime('%w', date)
             WHEN '0' THEN 'Sunday'
             WHEN '1' THEN 'Monday'
             WHEN '2' THEN 'Tuesday'
             WHEN '3' THEN 'Wednesday'
             WHEN '4' THEN 'Thursday'
             WHEN '5' THEN 'Friday'
             WHEN '6' THEN 'Saturday'
         END AS day,
         attendance_status
       FROM lectures
       WHERE user_id = ? AND date >= date('now', '-6 days')`,
      [userId]
    );

    // Process weekly attendance
    const weeklyAttendanceMap = {};
    for (const row of weeklyDataRaw) {
      const key = row.day;
      if (!weeklyAttendanceMap[key]) {
        weeklyAttendanceMap[key] = { day: key, total: 0, attended: 0 };
      }
      weeklyAttendanceMap[key].total++;
      if (row.attendance_status === "present") {
        weeklyAttendanceMap[key].attended++;
      }
    }
    const weeklyAttendance = Object.values(weeklyAttendanceMap).sort(
      (a, b) => new Date(`1970-01-0${a.dayNum}`) - new Date(`1970-01-0${b.dayNum}`)
    );

    // Assignments
    const recentAssignments = await dbAll(
      `SELECT 
         id, title, due_date, status,
         CASE 
           WHEN status != 'completed' AND DATE(due_date) < DATE('now') THEN 1
           ELSE 0
         END AS is_overdue
       FROM assignments
       WHERE user_id = ?
       ORDER BY due_date DESC
       LIMIT 10`,
      [userId]
    );

    // Assignment stats
    const assignmentStats = {
      completed: recentAssignments.filter((a) => a.status === "completed").length,
      pending: recentAssignments.filter((a) => a.status === "pending").length,
    };

    res.json({
      lectures,
      attendanceStats: {
        total,
        present,
        attendance_percentage,
      },
      weeklyAttendance,
      recentAssignments,
      assignmentStats,
    });
  } catch (err) {
    console.error("❌ Dashboard error:", err);
    res.status(500).json({ error: "Failed to load dashboard" });
  }
});


app.use((req, res, next) => {
  console.log(`🔍 ${new Date().toISOString()} - ${req.method} ${req.path}`);
  console.log(`🔍 Headers:`, req.headers);
  next();
});

// Add this to see all registered routes
app.use('/api', (req, res, next) => {
  console.log(`🔍 API Route: ${req.method} ${req.path}`);
  next();
});

// ============= TEST ROUTE (ADD THIS FIRST) =============
// Add this simple test route BEFORE other routes to verify routing works
app.get('/api/test', (req, res) => {
  res.json({ 
    message: 'Test route working!', 
    timestamp: new Date().toISOString(),
    method: req.method,
    path: req.path
  });
});

app.get('/api/attendance/test', (req, res) => {
  console.log('🔍 Attendance test route hit!');
  res.json({ 
    message: 'Attendance routes working!',
    timestamp: new Date().toISOString()
  });
});

// DEBUG ROUTE (no auth required for testing)
app.get('/api/attendance/debug', async (req, res) => {
  console.log('🔍 Debug route hit!');
  try {
    res.json({
      message: 'Debug endpoint working!',
      timestamp: new Date().toISOString(),
      server: 'Express with Turso',
      routes: 'Attendance routes loaded'
    });
  } catch (err) {
    console.error('❌ Debug error:', err);
    res.json({ error: err.message });
  }
});

  
  app.get("/api/lectures", authenticateToken, async (req, res) => {
    try{
   const rows = await dbAll(
     `SELECT
        id,
        name,
        subject,
        date      AS schedule_days,  
        time      AS schedule_time,
        attendance_status,
        created_at
      FROM lectures
      WHERE user_id = ?
      ORDER BY date DESC, time DESC`,
     [req.user.userId]
   );

    const lectures = rows.map(r => {
     let days = [];
     try {
       days = JSON.parse(r.schedule_days);
     } catch (_) {
     }

     return {
       id:                    r.id,
       name:                  r.name,
       subject:               r.subject,
       schedule_days:         days,
       schedule_time:         r.schedule_time,
       attendance_status:     r.attendance_status,
       created_at:            r.created_at
     };
   });
      res.json(lectures);
    }  catch (err) {
    console.error("Error in GET /api/lectures:", err);
    return res.status(500).json({ error: "Server error" });
  }
  });

  app.post(
    "/api/lectures",
    [
      authenticateToken,
      body("name").isLength({ min: 1 }).trim(),
      body("subject").isLength({ min: 1 }).trim(),
      body("schedule_days").isArray({ min: 1 }).withMessage("At least one day required"),
      body("schedule_time").matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage("Invalid time format"),
    ],
    async (req, res) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({ errors: errors.array() });
        }

        const { name, subject, schedule_days: date, schedule_time: time } = req.body;
        console.log("Payload for DB:", {
  userId: req.user.userId,
  name,
  subject,
  date,
  time,
});
        const result = await dbRun(
  "INSERT INTO lectures (user_id, name, subject, date, time) VALUES (?, ?, ?, ?, ?)",
  [
    req.user.userId,
    name,
    subject,
    JSON.stringify(date),
    time,
  ]
);

        const lecture = await dbGet("SELECT * FROM lectures WHERE id = ?", [
          result.lastInsertRowid,
        ]);
        lecture.date = JSON.parse(lecture.date);
        lecture.schedule_days = lecture.date;
delete lecture.date;
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

  app.get("/api/attendance", authenticateToken, async (req, res) => {
  try {
    const attendance = await dbAll(
      `SELECT 
         l.id,
         l.name,
         l.subject,
         l.date,
         l.time,
         l.attendance_status,
         l.created_at
       FROM lectures l
       WHERE l.user_id = ?
       ORDER BY l.date DESC, l.time DESC`,
      [req.user.userId]
    );
    const result = Array.isArray(attendance) ? attendance : [];
    res.json(result);
  } catch (err) {
    console.error("Get attendance error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// GET /api/attendance/stats - Get attendance statistics
app.get("/api/attendance/stats", authenticateToken, async (req, res) => {
  try {
    const stats = await dbAll(
      `SELECT 
         attendance_status,
         COUNT(*) as count
       FROM lectures
       WHERE user_id = ?
       GROUP BY attendance_status`,
      [req.user.userId]
    );

    const total = await dbGet(
      "SELECT COUNT(*) as total FROM lectures WHERE user_id = ?",
      [req.user.userId]
    );

    // Process stats
    const present = stats.find(s => s.attendance_status === 'present')?.count || 0;
    const absent = stats.find(s => s.attendance_status === 'absent')?.count || 0;
    const totalCount = total.total || 0;
    const attendance_percentage = totalCount > 0 ? Math.round((present / totalCount) * 100) : 0;

    const result = {
      total: totalCount,
      present,
      absent,
      attendance_percentage,
      stats: stats || [], 
      breakdown: {
        present,
        absent,
        total: totalCount
      }
    };
    
    res.json(result);
  } catch (err) {
    console.error("❌ Get attendance stats error:", err);
    res.status(500).json({ 
      error: "Server error", 
      details: err.message,
      total: 0,
      present: 0,
      absent: 0,
      attendance_percentage: 0,
      stats: [],
      breakdown: { present: 0, absent: 0, total: 0 }
    });
  }
});

// GET /api/attendance/weekly - Get weekly attendance data
app.get("/api/attendance/weekly", authenticateToken, async (req, res) => {
  try {
    console.log("🔍 GET /api/attendance/weekly called for user:", req.user.userId);
    
    const weeklyData = await dbAll(
      `SELECT 
         strftime('%w', date) AS dayNum,
         CASE strftime('%w', date)
             WHEN '0' THEN 'Sunday'
             WHEN '1' THEN 'Monday'
             WHEN '2' THEN 'Tuesday'
             WHEN '3' THEN 'Wednesday'
             WHEN '4' THEN 'Thursday'
             WHEN '5' THEN 'Friday'
             WHEN '6' THEN 'Saturday'
         END AS day,
         attendance_status,
         COUNT(*) as count
       FROM lectures
       WHERE user_id = ? AND date >= date('now', '-6 days')
       GROUP BY strftime('%w', date), day, attendance_status
       ORDER BY dayNum`,
      [req.user.userId]
    );

    console.log("📊 Raw weekly data:", weeklyData);

    // Process weekly data with safe defaults
    const weeklyAttendance = {};
    const defaultDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    // Initialize all days with default values
    defaultDays.forEach((day, index) => {
      weeklyAttendance[day] = {
        day: day,
        total: 0,
        attended: 0,
        dayNum: index
      };
    });

    // Populate with actual data
    for (const row of weeklyData) {
      const key = row.day;
      if (!weeklyAttendance[key]) {
        weeklyAttendance[key] = {
          day: key,
          total: 0,
          attended: 0,
          dayNum: parseInt(row.dayNum)
        };
      }
      weeklyAttendance[key].total += row.count;
      if (row.attendance_status === 'present') {
        weeklyAttendance[key].attended += row.count;
      }
    }

    // Convert to array and sort by day
    const result = Object.values(weeklyAttendance).sort((a, b) => a.dayNum - b.dayNum);
    
    console.log("📊 Final weekly result:", result);
    res.json(result);
  } catch (err) {
    console.error("❌ Get weekly attendance error:", err);
    // Return safe fallback array
    const defaultWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
      .map((day, index) => ({
        day,
        total: 0,
        attended: 0,
        dayNum: index
      }));
    
    res.status(500).json({ 
      error: "Server error", 
      details: err.message,
      data: defaultWeek // Safe fallback
    });
  }
});


// POST /api/attendance - Create new attendance record (lecture with attendance)
app.post(
  "/api/attendance",
  [
    authenticateToken,
    body("name").isLength({ min: 1 }).trim(),
    body("subject").isLength({ min: 1 }).trim(),
    body("date").isISO8601(),
    body("time").matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
    body("attendance_status").isIn(['present', 'absent']).optional()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { name, subject, date, time, attendance_status = 'present' } = req.body;
      
      const result = await dbRun(
        "INSERT INTO lectures (user_id, name, subject, date, time, attendance_status) VALUES (?, ?, ?, ?, ?, ?)",
        [req.user.userId, name, subject, date, time, attendance_status]
      );

      const attendance = await dbGet(
        "SELECT * FROM lectures WHERE id = ?",
        [result.lastInsertRowid]
      );

      res.status(201).json(attendance);
    } catch (err) {
      console.error("Create attendance error:", err);
      res.status(500).json({ error: "Server error" });
    }
  }
);

// PUT /api/attendance/:id - Update attendance status
app.put("/api/attendance/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { attendance_status } = req.body;

    // Validate attendance_status
    if (!['present', 'absent', 'cancelled'].includes(attendance_status)) {
      return res.status(400).json({ error: "Invalid attendance status" });
    }

    const lecture = await dbGet(
      "SELECT * FROM lectures WHERE id = ? AND user_id = ?",
      [id, req.user.userId]
    );

    if (!lecture) {
      return res.status(404).json({ error: "Attendance record not found" });
    }

    await dbRun(
      "UPDATE lectures SET attendance_status = ? WHERE id = ? AND user_id = ?",
      [attendance_status, id, req.user.userId]
    );

    const updatedAttendance = await dbGet(
      "SELECT * FROM lectures WHERE id = ? AND user_id = ?",
      [id, req.user.userId]
    );

    res.json(updatedAttendance);
  } catch (err) {
    console.error("Update attendance error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// DELETE /api/attendance/:id - Delete attendance record
app.delete("/api/lectures/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const attendance = await dbGet(
      "SELECT * FROM lectures WHERE id = ? AND user_id = ?",
      [id, req.user.userId]
    );

    if (!attendance) {
      return res.status(404).json({ error: "Attendance record not found" });
    }

    await dbRun(
      "DELETE FROM lectures WHERE id = ? AND user_id = ?",
      [id, req.user.userId]
    );

    res.json({ message: "Attendance record deleted successfully" });
  } catch (err) {
    console.error("Delete attendance error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

  app.get("/api/attendance/debug", authenticateToken, async (req, res) => {
  try {
    const allData = {
      attendance: await dbAll("SELECT * FROM lectures WHERE user_id = ? ORDER BY date DESC", [req.user.userId]),
      stats: await dbAll("SELECT attendance_status, COUNT(*) as count FROM lectures WHERE user_id = ? GROUP BY attendance_status", [req.user.userId]),
      user: req.user
    };
    
    console.log("🐛 DEBUG - All attendance data:", JSON.stringify(allData, null, 2));
    res.json(allData);
  } catch (err) {
    console.error("❌ Debug error:", err);
    res.json({ error: err.message, stack: err.stack });
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

    app.delete("/api/assignments/:id", authenticateToken, async (req, res) => {
    try {
      const { id } = req.params;

      const assignment = await dbGet(
        "SELECT * FROM assignments WHERE id = ? AND user_id = ?",
        [id, req.user.userId],
      );

      if (!assignment) {
        return res.status(404).json({ error: "Assignment not found" });
      }

      await dbRun("DELETE FROM assignments WHERE id = ? AND user_id = ?", [
        id,
        req.user.userId,
      ]);

      res.json({ message: "Assignment deleted successfully" });
    } catch (err) {
      console.error("Delete error:", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.put(
    "/api/assignments/:id",
    [
      authenticateToken,
      body("title").optional().trim(),
      body("description").optional(),
      body("due_date").optional().isISO8601(),
      body("priority").optional().isIn(["low", "medium", "high"]),
    ],
    async (req, res) => {
      try {
        const { id } = req.params;
        const { title, description, due_date, priority } = req.body;

        const assignment = await dbGet(
          "SELECT * FROM assignments WHERE id = ? AND user_id = ?",
          [id, req.user.userId],
        );

        if (!assignment) {
          return res.status(404).json({ error: "Assignment not found" });
        }

        const updated = {
          title: title ?? assignment.title,
          description: description ?? assignment.description,
          due_date: due_date ?? assignment.due_date,
          priority: priority ?? assignment.priority,
        };

        await dbRun(
          `UPDATE assignments
         SET title = ?, description = ?, due_date = ?, priority = ?
         WHERE id = ? AND user_id = ?`,
          [
            updated.title,
            updated.description,
            updated.due_date,
            updated.priority,
            id,
            req.user.userId,
          ],
        );

        const updatedAssignment = await dbGet(
          "SELECT * FROM assignments WHERE id = ?",
          [id],
        );

        res.json(updatedAssignment);
      } catch (err) {
        console.error("Update error:", err);
        res.status(500).json({ error: "Server error" });
      }
    },
  );

  app.patch(
    "/api/assignments/:id/status",
    [
      authenticateToken,
      body("status").isIn(["pending", "completed", "missed"]),
    ],
    async (req, res) => {
      try {
        const { id } = req.params;
        const { status } = req.body;

        const assignment = await dbGet(
          "SELECT * FROM assignments WHERE id = ? AND user_id = ?",
          [id, req.user.userId],
        );

        if (!assignment) {
          return res.status(404).json({ error: "Assignment not found" });
        }

        await dbRun(
          "UPDATE assignments SET status = ? WHERE id = ? AND user_id = ?",
          [status, id, req.user.userId],
        );

        const updatedAssignment = await dbGet(
          "SELECT * FROM assignments WHERE id = ?",
          [id],
        );

        res.json(updatedAssignment);
      } catch (err) {
        console.error("Status update error:", err);
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
