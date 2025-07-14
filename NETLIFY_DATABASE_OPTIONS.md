# Database Options for Netlify Deployment

## Recommended Solutions

### 1. **Turso (SQLite-compatible, serverless)**

- **Pros**: SQLite syntax, serverless, edge locations
- **Setup**:
  ```bash
  npm install @libsql/client
  ```
- **Free Tier**: 500MB, 1 billion row reads
- **URL**: https://turso.tech

### 2. **Supabase (PostgreSQL)**

- **Pros**: Full PostgreSQL, real-time, auth included
- **Setup**:
  ```bash
  npm install @supabase/supabase-js
  ```
- **Free Tier**: 500MB database, 50MB file storage
- **URL**: https://supabase.com

### 3. **PlanetScale (MySQL)**

- **Pros**: Serverless MySQL, branching, scaling
- **Setup**:
  ```bash
  npm install @planetscale/database
  ```
- **Free Tier**: 1 database, 1GB storage, 1 billion row reads
- **URL**: https://planetscale.com

### 4. **Railway (PostgreSQL/MySQL)**

- **Pros**: Simple setup, multiple database types
- **Free Tier**: $5 credit monthly
- **URL**: https://railway.app

### 5. **Xata (Serverless)**

- **Pros**: Serverless, TypeScript-first, built-in search
- **Free Tier**: 10GB database, 250k transactions
- **URL**: https://xata.io

## Quick Migration Guide

### Turso (Easiest SQLite Migration)

1. Sign up at turso.tech
2. Create database: `turso db create studysphere`
3. Get connection URL: `turso db show studysphere --url`
4. Replace SQLite with libSQL client

### Supabase (Most Features)

1. Sign up at supabase.com
2. Create project and get database URL
3. Run SQL migrations in Supabase dashboard
4. Replace database client

## Environment Variables Needed

```env
# For Turso
DATABASE_URL=libsql://your-database.turso.io
DATABASE_AUTH_TOKEN=your-auth-token

# For Supabase
DATABASE_URL=postgresql://...
SUPABASE_ANON_KEY=your-anon-key

# For PlanetScale
DATABASE_URL=mysql://...
```
