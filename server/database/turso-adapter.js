const { createClient } = require("@libsql/client");

class TursoAdapter {
  constructor() {
    this.client = createClient({
      url: process.env.DATABASE_URL || "file:local.db",
      authToken: process.env.DATABASE_AUTH_TOKEN,
    });
  }

  async init() {
    // Create tables
    await this.client.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        name TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await this.client.execute(`
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

    await this.client.execute(`
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
  }

  async get(query, params = []) {
    const result = await this.client.execute({
      sql: query,
      args: params,
    });
    return result.rows[0];
  }

  async all(query, params = []) {
    const result = await this.client.execute({
      sql: query,
      args: params,
    });
    return result.rows;
  }

  async run(query, params = []) {
    const result = await this.client.execute({
      sql: query,
      args: params,
    });
    return {
      lastInsertRowid: result.lastInsertRowid,
      changes: result.rowsAffected,
    };
  }
}

module.exports = TursoAdapter;
