# Deploy StudySphere to Netlify with Turso Database

## Prerequisites

1. **Netlify Account**: Sign up at https://netlify.com
2. **Turso Account**: Sign up at https://turso.tech
3. **GitHub Repository**: Your code pushed to GitHub

## Step 1: Create Turso Database

### 1.1 Install Turso CLI

```bash
# Option 1: Direct install
curl -sSfL https://get.tur.so/install.sh | bash

# Option 2: Via npm
npm install -g @turso/cli

# Verify installation
turso --version
```

### 1.2 Create Database

```bash
# Login to Turso
turso auth login

# Create database
turso db create studysphere

# Get database URL (save this!)
turso db show studysphere --url
# Example output: libsql://studysphere-yourname.turso.io

# Create auth token (save this!)
turso db tokens create studysphere
# Example output: eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9...

# Test connection
turso db shell studysphere
# Type .quit to exit
```

## Step 2: Deploy to Netlify

### 2.1 Connect Repository

1. Go to https://app.netlify.com
2. Click "New site from Git"
3. Choose GitHub and authorize
4. Select your StudySphere repository
5. Configure build settings:
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
   - **Functions directory**: `netlify/functions`

### 2.2 Set Environment Variables

In Netlify Dashboard → Site Settings → Environment Variables, add:

```
# Required - Replace with your values from Step 1.2
DATABASE_URL=libsql://studysphere-yourname.turso.io
DATABASE_AUTH_TOKEN=your-token-from-turso

# Required - Generate strong secrets
JWT_SECRET=your-super-secure-64-character-jwt-secret-here
SESSION_SECRET=your-super-secure-64-character-session-secret-here

# Required - Update with your Netlify domain after deployment
CORS_ORIGIN=https://your-app-name.netlify.app

# Optional - Adjust as needed
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
SECURITY_HEADERS=true
NODE_ENV=production
NETLIFY=true
```

### 2.3 Deploy

1. Click "Deploy site"
2. Wait for build to complete (usually 2-3 minutes)
3. Your app will be available at: `https://your-app-name.netlify.app`

## Step 3: Update CORS Configuration

After deployment:

1. Note your Netlify URL (e.g., `https://studysphere-app.netlify.app`)
2. Update `CORS_ORIGIN` environment variable in Netlify
3. Redeploy the site

## Step 4: Test Your Deployment

### 4.1 Basic Health Check

```bash
# Test health endpoint
curl https://your-app-name.netlify.app/.netlify/functions/api/health
```

Expected response:

```json
{
  "status": "OK",
  "database": "Turso",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

### 4.2 Test Registration

```bash
# Test user registration
curl -X POST https://your-app-name.netlify.app/.netlify/functions/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "name": "Test User"
  }'
```

Expected response:

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "test@example.com",
    "name": "Test User"
  }
}
```

### 4.3 Test Login

```bash
# Test user login
curl -X POST https://your-app-name.netlify.app/.netlify/functions/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

## Step 5: Monitor Your Application

### 5.1 Netlify Function Logs

1. Go to Netlify Dashboard
2. Click on your site
3. Go to "Functions" tab
4. Click on "api" function
5. View logs for debugging

### 5.2 Turso Database Usage

1. Go to https://app.turso.tech
2. Select your database
3. View usage statistics
4. Monitor free tier limits:
   - Storage: 500MB
   - Row reads: 1 billion/month

### 5.3 Set Up Monitoring

```bash
# Check database stats
turso db inspect studysphere

# View recent queries (helpful for debugging)
turso db shell studysphere
# In shell: SELECT * FROM users LIMIT 5;
```

## Troubleshooting

### Common Issues

**1. Function Timeout**

```
Error: Function execution timed out
```

**Solution**: Check Turso connection. Verify `DATABASE_URL` and `DATABASE_AUTH_TOKEN`.

**2. CORS Error**

```
Access to fetch at '...' from origin '...' has been blocked by CORS policy
```

**Solution**: Update `CORS_ORIGIN` environment variable with correct Netlify URL.

**3. Database Connection Error**

```
Error: Failed to initialize database
```

**Solution**:

- Verify Turso credentials in environment variables
- Check Turso dashboard for database status
- Test connection with `turso db shell studysphere`

**4. JWT Errors**

```
Error: Invalid or expired token
```

**Solution**: Ensure `JWT_SECRET` is set and at least 64 characters long.

### Debug Steps

1. **Check Function Logs**: Netlify Dashboard → Functions → api → View logs
2. **Test Database**: `turso db shell studysphere`
3. **Verify Environment Variables**: Netlify Dashboard → Site Settings → Environment Variables
4. **Test API Endpoints**: Use curl commands from Step 4

## Success Checklist

- ✅ Turso database created and accessible
- ✅ Netlify site deployed successfully
- ✅ Environment variables configured
- ✅ Health check endpoint working
- ✅ User registration working
- ✅ User login working
- ✅ Frontend can access API
- ✅ Database persists data between function calls

## Free Tier Limits

**Turso Free Tier:**

- 500MB storage
- 1 billion row reads/month
- 3 databases
- 3 edge locations

**Netlify Free Tier:**

- 100GB bandwidth/month
- 125,000 function invocations/month
- Custom domain support

This setup will easily handle hundreds of users on the free tier! 🚀

## Need Help?

- **Turso Documentation**: https://docs.turso.tech
- **Netlify Functions Guide**: https://docs.netlify.com/functions/overview
- **StudySphere Support**: Check function logs for detailed error messages
