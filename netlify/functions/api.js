const serverless = require("serverless-http");
const express = require("express");
const cors = require("cors");
const { v4: uuidv4 } = require("uuid");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// In-memory database for Netlify (serverless functions are stateless)
// For production, use a database service like Turso, PlanetScale, or Supabase
const db = {
  users: [],
  lectures: [],
  attendance: [],
  assignments: []
};

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// JWT Configuration
const JWT_SECRET = process.env.JWT_SECRET || "netlify-dev-secret-change-in-production";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

// Auth middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Access token required" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ error: "Invalid or expired token" });
  }
};

// Health check
app.get("/api/ping", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Auth Routes
app.post("/api/auth/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: "Name, email, and password are required" });
    }

    // Check if user exists
    const existingUser = db.users.find(u => u.email === email);
    if (existingUser) {
      return res.status(400).json({ error: "Email already registered" });
    }

    // Password validation
    if (password.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const user = {
      id: uuidv4(),
      name,
      email,
      password: hashedPassword,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    db.users.push(user);

    // Generate token
    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN
    });

    res.status(201).json({
      user: { id: user.id, name: user.name, email: user.email },
      token
    });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    // Find user
    const user = db.users.find(u => u.email === email);
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Check password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Generate token
    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN
    });

    res.json({
      user: { id: user.id, name: user.name, email: user.email },
      token
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/api/auth/profile", authenticateToken, (req, res) => {
  const user = db.users.find(u => u.id === req.user.userId);
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }
  res.json({ id: user.id, name: user.name, email: user.email });
});

// Lectures Routes
app.get("/api/lectures", authenticateToken, (req, res) => {
  const userLectures = db.lectures.filter(l => l.user_id === req.user.userId);
  res.json(userLectures);
});

app.post("/api/lectures", authenticateToken, (req, res) => {
  try {
    const { name, schedule_days, schedule_time } = req.body;

    if (!name || !schedule_days || !schedule_time) {
      return res.status(400).json({ error: "Name, schedule_days, and schedule_time are required" });
    }

    const lecture = {
      id: uuidv4(),
      user_id: req.user.userId,
      name,
      schedule_days: Array.isArray(schedule_days) ? schedule_days : JSON.parse(schedule_days),
      schedule_time,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    db.lectures.push(lecture);
    res.status(201).json(lecture);
  } catch (error) {
    console.error("Create lecture error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.put("/api/lectures/:id", authenticateToken, (req, res) => {
  const lectureIndex = db.lectures.findIndex(
    l => l.id === req.params.id && l.user_id === req.user.userId
  );

  if (lectureIndex === -1) {
    return res.status(404).json({ error: "Lecture not found" });
  }

  const { name, schedule_days, schedule_time } = req.body;
  
  if (name) db.lectures[lectureIndex].name = name;
  if (schedule_days) {
    db.lectures[lectureIndex].schedule_days = Array.isArray(schedule_days) 
      ? schedule_days 
      : JSON.parse(schedule_days);
  }
  if (schedule_time) db.lectures[lectureIndex].schedule_time = schedule_time;
  db.lectures[lectureIndex].updated_at = new Date().toISOString();

  res.json(db.lectures[lectureIndex]);
});

app.delete("/api/lectures/:id", authenticateToken, (req, res) => {
  const lectureIndex = db.lectures.findIndex(
    l => l.id === req.params.id && l.user_id === req.user.userId
  );

  if (lectureIndex === -1) {
    return res.status(404).json({ error: "Lecture not found" });
  }

  db.lectures.splice(lectureIndex, 1);
  // Also delete related attendance
  db.attendance = db.attendance.filter(a => a.lecture_id !== req.params.id);
  
  res.json({ message: "Lecture deleted" });
});

// Attendance Routes
app.get("/api/attendance", authenticateToken, (req, res) => {
  const userAttendance = db.attendance
    .filter(a => a.user_id === req.user.userId)
    .map(a => {
      const lecture = db.lectures.find(l => l.id === a.lecture_id);
      return {
        ...a,
        lecture_name: lecture ? lecture.name : "Unknown"
      };
    });
  res.json(userAttendance);
});

app.post("/api/attendance", authenticateToken, (req, res) => {
  try {
    const { lecture_id, date, status } = req.body;

    if (!lecture_id || !date || !status) {
      return res.status(400).json({ error: "lecture_id, date, and status are required" });
    }

    // Check lecture exists and belongs to user
    const lecture = db.lectures.find(
      l => l.id === lecture_id && l.user_id === req.user.userId
    );
    if (!lecture) {
      return res.status(404).json({ error: "Lecture not found" });
    }

    // Check if attendance already exists for this date
    const existing = db.attendance.find(
      a => a.lecture_id === lecture_id && a.date === date
    );
    if (existing) {
      return res.status(400).json({ error: "Attendance already marked for this date" });
    }

    const attendance = {
      id: uuidv4(),
      lecture_id,
      user_id: req.user.userId,
      date,
      status,
      lecture_name: lecture.name,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    db.attendance.push(attendance);
    res.status(201).json(attendance);
  } catch (error) {
    console.error("Create attendance error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.put("/api/attendance/:id", authenticateToken, (req, res) => {
  const attendanceIndex = db.attendance.findIndex(
    a => a.id === req.params.id && a.user_id === req.user.userId
  );

  if (attendanceIndex === -1) {
    return res.status(404).json({ error: "Attendance record not found" });
  }

  const { status } = req.body;
  if (status) {
    db.attendance[attendanceIndex].status = status;
    db.attendance[attendanceIndex].updated_at = new Date().toISOString();
  }

  res.json(db.attendance[attendanceIndex]);
});

app.delete("/api/attendance/:id", authenticateToken, (req, res) => {
  const attendanceIndex = db.attendance.findIndex(
    a => a.id === req.params.id && a.user_id === req.user.userId
  );

  if (attendanceIndex === -1) {
    return res.status(404).json({ error: "Attendance record not found" });
  }

  db.attendance.splice(attendanceIndex, 1);
  res.json({ message: "Attendance deleted" });
});

// Assignments Routes
app.get("/api/assignments", authenticateToken, (req, res) => {
  const userAssignments = db.assignments.filter(a => a.user_id === req.user.userId);
  res.json(userAssignments);
});

app.post("/api/assignments", authenticateToken, (req, res) => {
  try {
    const { title, subject, description, due_date, priority } = req.body;

    if (!title || !subject || !due_date) {
      return res.status(400).json({ error: "Title, subject, and due_date are required" });
    }

    const assignment = {
      id: uuidv4(),
      user_id: req.user.userId,
      title,
      subject,
      description: description || "",
      due_date,
      priority: priority || "medium",
      status: "pending",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    db.assignments.push(assignment);
    res.status(201).json(assignment);
  } catch (error) {
    console.error("Create assignment error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.put("/api/assignments/:id", authenticateToken, (req, res) => {
  const assignmentIndex = db.assignments.findIndex(
    a => a.id === req.params.id && a.user_id === req.user.userId
  );

  if (assignmentIndex === -1) {
    return res.status(404).json({ error: "Assignment not found" });
  }

  const { title, subject, description, due_date, priority, status } = req.body;
  
  if (title) db.assignments[assignmentIndex].title = title;
  if (subject) db.assignments[assignmentIndex].subject = subject;
  if (description !== undefined) db.assignments[assignmentIndex].description = description;
  if (due_date) db.assignments[assignmentIndex].due_date = due_date;
  if (priority) db.assignments[assignmentIndex].priority = priority;
  if (status) db.assignments[assignmentIndex].status = status;
  db.assignments[assignmentIndex].updated_at = new Date().toISOString();

  res.json(db.assignments[assignmentIndex]);
});

app.patch("/api/assignments/:id/status", authenticateToken, (req, res) => {
  const assignmentIndex = db.assignments.findIndex(
    a => a.id === req.params.id && a.user_id === req.user.userId
  );

  if (assignmentIndex === -1) {
    return res.status(404).json({ error: "Assignment not found" });
  }

  const { status } = req.body;
  if (status) {
    db.assignments[assignmentIndex].status = status;
    db.assignments[assignmentIndex].updated_at = new Date().toISOString();
  }

  res.json(db.assignments[assignmentIndex]);
});

app.delete("/api/assignments/:id", authenticateToken, (req, res) => {
  const assignmentIndex = db.assignments.findIndex(
    a => a.id === req.params.id && a.user_id === req.user.userId
  );

  if (assignmentIndex === -1) {
    return res.status(404).json({ error: "Assignment not found" });
  }

  db.assignments.splice(assignmentIndex, 1);
  res.json({ message: "Assignment deleted" });
});

// Dashboard Route
app.get("/api/dashboard", authenticateToken, (req, res) => {
  const userId = req.user.userId;
  const user = db.users.find(u => u.id === userId);

  // Get user's lectures
  const userLectures = db.lectures.filter(l => l.user_id === userId);
  
  // Get user's attendance
  const userAttendance = db.attendance.filter(a => a.user_id === userId);
  
  // Get user's assignments
  const userAssignments = db.assignments.filter(a => a.user_id === userId);

  // Calculate attendance stats
  const totalClasses = userAttendance.length;
  const attendedClasses = userAttendance.filter(a => a.status === "present").length;
  const absentClasses = userAttendance.filter(a => a.status === "absent").length;
  const cancelledClasses = userAttendance.filter(a => a.status === "cancelled").length;
  const effectiveClasses = totalClasses - cancelledClasses;
  const attendancePercentage = effectiveClasses > 0 
    ? Math.round((attendedClasses / effectiveClasses) * 100)
    : 0;

  // Calculate classes needed to reach 75%
  let classesToReach75 = 0;
  if (attendancePercentage < 75 && effectiveClasses > 0) {
    // Formula: (attended + x) / (effective + x) >= 0.75
    // x = (0.75 * effective - attended) / 0.25
    classesToReach75 = Math.ceil((0.75 * effectiveClasses - attendedClasses) / 0.25);
  }

  // Calculate assignment stats
  const totalAssignments = userAssignments.length;
  const completedAssignments = userAssignments.filter(a => a.status === "completed").length;
  const pendingAssignments = userAssignments.filter(a => a.status === "pending").length;
  const missedAssignments = userAssignments.filter(a => a.status === "missed").length;
  const overdueAssignments = userAssignments.filter(a => {
    return a.status === "pending" && new Date(a.due_date) < new Date();
  }).length;

  // Build weekly attendance data (last 7 days)
  const weeklyAttendance = [];
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split("T")[0];
    const dayAttendance = userAttendance.filter(a => a.date === dateStr);
    weeklyAttendance.push({
      day: dayNames[date.getDay()],
      attended: dayAttendance.filter(a => a.status === "present").length,
      total: dayAttendance.length
    });
  }

  // Build attendance data for pie chart
  const attendanceData = [
    { name: "Present", value: attendedClasses, color: "#22c55e" },
    { name: "Absent", value: absentClasses, color: "#ef4444" },
    { name: "Cancelled", value: cancelledClasses, color: "#6b7280" }
  ];

  res.json({
    user: user ? { id: user.id, name: user.name, email: user.email } : null,
    attendanceStats: {
      total_classes: totalClasses,
      attended_classes: attendedClasses,
      absent_classes: absentClasses,
      cancelled_classes: cancelledClasses,
      attendance_percentage: attendancePercentage,
      classes_to_75_percent: classesToReach75
    },
    attendanceData,
    weeklyAttendance,
    assignmentStats: {
      total: totalAssignments,
      completed: completedAssignments,
      pending: pendingAssignments,
      missed: missedAssignments,
      overdue: overdueAssignments
    },
    recentAssignments: userAssignments
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5),
    totalLectures: userLectures.length
  });
});

// Export handler for Netlify
module.exports.handler = serverless(app);
