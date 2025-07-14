# Complete Turso Migration Guide for StudySphere

## Why Turso?

✅ **Free Tier**: 500MB storage, 1 billion row reads/month  
✅ **SQLite Compatible**: Minimal code changes needed  
✅ **Edge Database**: Fast global replication  
✅ **Serverless**: Perfect for Netlify Functions  
✅ **Zero Cold Start**: Always ready

## Step 1: Create Turso Account & Database

### 1.1 Install Turso CLI

```bash
# Install Turso CLI
curl -sSfL https://get.tur.so/install.sh | bash

# Or with npm
npm install -g @turso/cli
```

### 1.2 Create Account & Database

```bash
# Login to Turso
turso auth login

# Create your database
turso db create studysphere

# Get your database URL
turso db show studysphere --url
# Output: libsql://studysphere-[username].turso.io
# libsql://studysphere-chirag8405.aws-ap-south-1.turso.io
# Create authentication token
turso db tokens create studysphere
# Output: eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9...
# eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3NTI0NzQwNzgsImlkIjoiMGNjM2YzMTktNjk5OS00NTdkLWIxM2QtMWNlODFmZDQyMTM5IiwicmlkIjoiN2JlMGE2NmYtOTM1Yy00MjIxLWFlNzktYWI0OTUyOWI5YTA0In0.CpCw4IUNS00COB4ndrQ6-iwKly1UeR_pTyMmbSWjPA-_ZTZ4yrEstAMaFnYt4C2CyVz3xXNeIbpxA0GGWNNeAA
```


### 1.3 Test Connection

```bash
# Connect to your database
turso db shell studysphere

# Run a test query
.tables
.quit
```

## Step 2: Add Turso to Your Project

### 2.1 Install Dependencies

```bash
npm install @libsql/client
```

### 2.2 Update Environment Variables

```env
# .env (for local development)
DATABASE_URL=libsql://studysphere-[your-username].turso.io
DATABASE_AUTH_TOKEN=eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9...

# For Netlify deployment, add these to your Netlify environment variables
```

## Step 3: Migration Process

### 3.1 Export Current SQLite Data (if you have any)

```bash
# If you have existing data in studysphere.db
sqlite3 studysphere.db ".dump" > backup.sql
```

### 3.2 Import to Turso (if needed)

```bash
# Import your data to Turso
turso db shell studysphere < backup.sql
```

## Step 4: Code Changes

### 4.1 Create Turso Database Client

```javascript
// server/database/turso-client.js
const { createClient } = require("@libsql/client");

let client = null;

function getTursoClient() {
  if (!client) {
    client = createClient({
      url: process.env.DATABASE_URL,
      authToken: process.env.DATABASE_AUTH_TOKEN,
    });
  }
  return client;
}

async function initializeTursoDatabase() {
  const db = getTursoClient();

  // Create tables
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

  console.log("✅ Turso database initialized");
  return db;
}

module.exports = { getTursoClient, initializeTursoDatabase };
```

## Step 5: Free Tier Limits & Optimization

### 5.1 Free Tier Details

- **Storage**: 500MB (plenty for student app)
- **Row Reads**: 1 billion/month (very generous)
- **Row Writes**: Unlimited
- **Databases**: 3 databases
- **Locations**: 3 edge locations

### 5.2 Optimization Tips

```javascript
// Use batch operations for better performance
async function bulkInsert(lectures) {
  const db = getTursoClient();
  const batch = lectures.map((lecture) => ({
    sql: "INSERT INTO lectures (user_id, subject, date, time) VALUES (?, ?, ?, ?)",
    args: [lecture.user_id, lecture.subject, lecture.date, lecture.time],
  }));

  await db.batch(batch);
}

// Use transactions for consistency
async function updateUserData(userId, userData, assignments) {
  const db = getTursoClient();
  await db.transaction(async (tx) => {
    await tx.execute({
      sql: "UPDATE users SET name = ? WHERE id = ?",
      args: [userData.name, userId],
    });

    for (const assignment of assignments) {
      await tx.execute({
        sql: "INSERT INTO assignments (user_id, title, due_date) VALUES (?, ?, ?)",
        args: [userId, assignment.title, assignment.due_date],
      });
    }
  });
}
```

## Step 6: Monitoring Usage

### 6.1 Check Usage

```bash
# Check your database usage
turso db inspect studysphere

# Monitor in Turso dashboard
# https://app.turso.tech
```

### 6.2 Usage Alerts

- Set up monitoring in Turso dashboard
- Get notified at 80% of limits
- Scale to paid plan if needed ($25/month for 1GB)

## Step 7: Deployment Steps

### 7.1 Set Netlify Environment Variables

1. Go to Netlify Dashboard
2. Site Settings → Environment Variables
3. Add:
   - `DATABASE_URL`: `libsql://studysphere-[your-username].turso.io`
   - `DATABASE_AUTH_TOKEN`: `your-token-here`

### 7.2 Update Netlify Function

```javascript
// netlify/functions/api.js
const {
  getTursoClient,
  initializeTursoDatabase,
} = require("../../server/database/turso-client");

let initialized = false;

exports.handler = async (event, context) => {
  try {
    // Initialize database only once
    if (!initialized) {
      await initializeTursoDatabase();
      initialized = true;
    }

    // Your existing API logic here
    const app = await getApp();
    const handler = serverless(app);
    return handler(event, context);
  } catch (error) {
    console.error("Function error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Internal server error" }),
    };
  }
};
```

## Step 8: Testing

### 8.1 Local Testing

```bash
# Start Netlify dev with Turso
netlify dev

# Test registration
curl -X POST http://localhost:8888/.netlify/functions/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","name":"Test User"}'
```

### 8.2 Production Testing

```bash
# Deploy to Netlify
git push origin main

# Test live endpoint
curl -X POST https://your-app.netlify.app/.netlify/functions/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","name":"Test User"}'
```

## Step 9: Backup Strategy

### 9.1 Automated Backups

```bash
# Create backup script
#!/bin/bash
DATE=$(date +"%Y%m%d_%H%M%S")
turso db shell studysphere ".dump" > "backup_${DATE}.sql"

# Schedule with cron (run weekly)
0 2 * * 0 /path/to/backup-script.sh
```

### 9.2 Restore Process

```bash
# Restore from backup
turso db shell studysphere < backup_20240101_120000.sql
```

## Benefits of This Setup

✅ **Always Available**: No cold starts  
✅ **Global Performance**: Edge replication  
✅ **Cost Effective**: Free for student apps  
✅ **Scalable**: Easy to upgrade when needed  
✅ **Reliable**: Built on SQLite foundation  
✅ **Compatible**: Minimal code changes

## Next Steps

1. **Follow this guide step by step**
2. **Test locally with `netlify dev`**
3. **Deploy to Netlify**
4. **Monitor usage in Turso dashboard**
5. **Set up automated backups**

Your StudySphere app will now have a persistent, fast, and free database! 🚀
