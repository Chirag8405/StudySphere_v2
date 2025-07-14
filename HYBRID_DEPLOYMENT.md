# Hybrid Deployment: Netlify + External Backend

## Architecture

```
Frontend (Netlify) -> External Backend (Railway/Render) -> Database
```

## Setup Steps

### 1. Deploy Backend to Railway

1. Sign up at railway.app
2. Connect GitHub repo
3. Add PostgreSQL service
4. Deploy backend service
5. Get backend URL: `https://your-app.railway.app`

### 2. Update Frontend for External API

```typescript
// client/lib/api.ts
const API_BASE_URL =
  process.env.NODE_ENV === "production"
    ? "https://your-backend.railway.app/api"
    : "/api";
```

### 3. Update CORS in Backend

```javascript
// server/index.ts
app.use(
  cors({
    origin: ["http://localhost:8888", "https://your-app.netlify.app"],
    credentials: true,
  }),
);
```

### 4. Deploy Frontend to Netlify

```toml
# netlify.toml
[build]
  publish = "dist"
  command = "npm run build:client"

# Remove functions directory since we're using external backend
# functionsDirectory = "netlify/functions"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

## Benefits

- ✅ Persistent database
- ✅ No cold start issues
- ✅ Simpler architecture
- ✅ Better performance
- ✅ Easier debugging

## Costs

- Railway: $5/month (includes database)
- Netlify: Free for frontend
- **Total**: ~$5/month
