# StudySphere Deployment Guide

## 🚀 Production Deployment Options

### Option 1: Docker Deployment (Recommended)

1. **Build and run with Docker Compose:**

```bash
# Clone the repository
git clone <your-repo-url>
cd studysphere

# Create environment file
cp .env.example .env
# Edit .env with your production values

# Build and start
docker-compose up -d
```

2. **Manual Docker build:**

```bash
# Build the image
docker build -t studysphere .

# Run the container
docker run -d \
  --name studysphere \
  -p 8080:8080 \
  -e JWT_SECRET="your-production-jwt-secret" \
  -v studysphere_data:/app/data \
  studysphere
```

### Option 2: Direct Node.js Deployment

1. **Prerequisites:**

   - Node.js 18+ installed
   - PM2 for process management (optional but recommended)

2. **Build and deploy:**

```bash
# Install dependencies
npm install

# Build the application
npm run build

# Start in production
npm start

# Or with PM2
npm install -g pm2
pm2 start dist/server/node-build.mjs --name studysphere
pm2 startup
pm2 save
```

### Option 3: Platform Deployments

#### Netlify (Frontend + Serverless Functions)

- The project includes `netlify.toml` configuration
- API routes will run as serverless functions
- Database will be SQLite file-based

#### Railway/Render/DigitalOcean

1. Connect your Git repository
2. Set environment variables:
   - `JWT_SECRET`: Strong secret key
   - `NODE_ENV`: production
3. Deploy with build command: `npm run build`
4. Start command: `npm start`

## 🔧 Environment Variables

Create a `.env` file with these variables:

```env
# Required
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters
NODE_ENV=production

# Optional
PORT=8080
JWT_EXPIRES_IN=7d
DATABASE_PATH=./studysphere.db
```

## 🎯 Demo Account (Development Only)

When running in development mode with seeding enabled:

- **Email:** `demo@studysphere.com`
- **Password:** `password123`

**Note:** Production deployments do not include demo data. Users must register their own accounts.

## 📊 Features

### Backend API

- **Authentication:** JWT-based with bcrypt password hashing
- **Database:** SQLite with full CRUD operations
- **Endpoints:**
  - `POST /api/auth/login` - User login
  - `POST /api/auth/register` - User registration
  - `GET /api/dashboard` - Dashboard data
  - `GET /api/lectures` - Lecture management
  - `GET /api/attendance` - Attendance tracking
  - `GET /api/assignments` - Assignment management

### Frontend Features

- **React 18** with TypeScript
- **TailwindCSS** with dark/light mode
- **React Router 6** for navigation
- **Recharts** for data visualization
- **Responsive design** for all screen sizes

## 🔒 Security Features

- JWT token authentication
- Password hashing with bcrypt
- CORS protection
- Input validation
- SQL injection protection
- XSS protection via React

## 🗄️ Database Schema

The SQLite database includes:

- **Users** - Authentication and profiles
- **Lectures** - Class scheduling and information
- **Attendance** - Attendance tracking with dates
- **Assignments** - Assignment management with due dates

## 📈 Production Considerations

1. **Database:** For production at scale, consider migrating to PostgreSQL
2. **File Storage:** For user uploads, integrate cloud storage
3. **Monitoring:** Add logging and monitoring (Sentry integration available)
4. **Backup:** Regular database backups
5. **SSL:** Use HTTPS in production
6. **CDN:** Consider CDN for static assets

## 🛠️ Development

```bash
# Development server
npm run dev

# Type checking
npm run typecheck

# Build
npm run build

# Production server
npm start
```

## 🎨 MCP Integrations Available

You can enhance StudySphere by connecting to these MCP servers:

- **Neon/Prisma** - For PostgreSQL database
- **Sentry** - For error monitoring
- **Netlify** - For deployment and hosting
- **Linear** - For project management
- **Notion** - For documentation

Connect via the "MCP Servers" button in Builder.io interface.
