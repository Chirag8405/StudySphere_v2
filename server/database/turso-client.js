import { createClient } from "@libsql/client";

let client = null;

function getTursoClient() {
  if (!client) {
    const url = process.env.DATABASE_URL;
    const authToken = process.env.DATABASE_AUTH_TOKEN;

    if (!url || url.includes("file:")) {
      console.log("⚠️  Using local SQLite fallback (development only)");
      client = createClient({
        url: "file:local-dev.db",
      });
    } else {
      console.log("🌍 Connecting to Turso database");
      client = createClient({
        url,
        authToken,
      });
    }
  }
  return client;
}

export async function initializeTursoDatabase() {
  const db = getTursoClient();

  try {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        name TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS lectures (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        subject TEXT NOT NULL,
        date TEXT NOT NULL,
        time TEXT NOT NULL,
        attendance_status TEXT DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS assignments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        due_date TEXT NOT NULL,
        priority TEXT DEFAULT 'medium',
        status TEXT DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )
    `);

    console.log("✅ Database tables initialized successfully");
    return db;
  } catch (error) {
    console.error("❌ Database initialization failed:", error);
    throw error;
  }
}

export async function dbGet(query, params = []) {
  const db = getTursoClient();
  const result = await db.execute({ sql: query, args: params });
  return result.rows[0] || null;
}

export async function dbAll(query, params = []) {
  const db = getTursoClient();
  const result = await db.execute({ sql: query, args: params });
  return result.rows;
}

export async function dbRun(query, params = []) {
  const db = getTursoClient();
  const result = await db.execute({ sql: query, args: params });
  return {
    lastInsertRowid: result.lastInsertRowid,
    changes: result.rowsAffected,
  };
}
