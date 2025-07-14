# 🎓 StudySphere - Complete Student Dashboard

A modern, full-stack student dashboard application for tracking attendance and managing assignments. Built with React, TypeScript, Express, and SQLite.

![StudySphere Dashboard](https://img.shields.io/badge/Status-Production%20Ready-brightgreen)
![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue)
![React](https://img.shields.io/badge/React-18.3-61dafb)
![Node.js](https://img.shields.io/badge/Node.js-18+-green)

## ✨ Features

### 🔐 Authentication System

- Secure JWT-based authentication
- User registration and login
- Password encryption with bcrypt
- Session management

### 📊 Dashboard

- Real-time attendance statistics
- Interactive charts and visualizations
- Assignment tracking and deadlines
- Progress indicators for 75% attendance requirement

### 📚 Attendance Management

- Lecture scheduling and tracking
- Mark attendance (Present/Absent/Cancelled)
- Automatic attendance percentage calculation
- Weekly and monthly attendance analytics

### 📝 Assignment Management

- Create, edit, and delete assignments
- Priority levels (High/Medium/Low)
- Status tracking (Pending/Completed/Missed)
- Due date reminders and overdue detection

### 🎨 Modern UI/UX

- Dark/Light mode toggle
- Responsive design for all devices
- Beautiful animations and transitions
- Accessible components with keyboard navigation

## 🚀 Quick Start

### Development Setup

### Development Setup

```bash
# Clone the repository
git clone <your-repo-url>
cd studysphere

# Install dependencies
npm install

# Start development server
npm run dev

# Open http://localhost:8080
```

### Production Build

```bash
# Build the application
npm run build

# Start production server
npm start
```

## 🌐 Production Deployment

### Deploy to Netlify

StudySphere is optimized for Netlify deployment:

```bash
# Build for production
npm run build:netlify

# Deploy to Netlify (connect your repo)
# Build command: npm run build:netlify
# Publish directory: dist/spa
```

### Other Deployment Options

```bash
# Docker deployment
npm run docker:build && npm run docker:run

# Traditional server deployment
npm run build:production && npm start:production
```

📖 **See [PRODUCTION.md](./PRODUCTION.md) for detailed deployment instructions.**

## 🛠️ Tech Stack

### Frontend

- **React 18** - UI framework
- **TypeScript** - Type safety
- **TailwindCSS** - Styling and theming
- **Shadcn/ui** - Component library
- **React Router 6** - Client-side routing
- **Recharts** - Data visualization
- **React Query** - Server state management

### Backend

- **Express.js** - Web framework
- **SQLite** - Database
- **JWT** - Authentication
- **bcrypt** - Password hashing
- **Zod** - Schema validation

### Development

- **Vite** - Build tool and dev server
- **Vitest** - Testing framework
- **Prettier** - Code formatting
- **ESLint** - Code linting

## 📁 Project Structure

```
studysphere/
├── client/                 # React frontend
│   ├── components/ui/      # Reusable UI components
│   ├── lib/               # Utilities and API services
│   ├── pages/             # Route components
│   └── App.tsx            # App entry point
├── server/                # Express backend
│   ├── database/          # Database connection and seeding
│   ├── models/            # Data models
│   ├── routes/            # API route handlers
│   ├── middleware/        # Custom middleware
│   └── utils/             # Server utilities
├── shared/                # Shared types and interfaces
├── dist/                  # Built application
└── docs/                  # Documentation
```

## 🔧 API Endpoints

### Authentication

- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/auth/profile` - Get user profile

### Dashboard

- `GET /api/dashboard` - Get dashboard data

### Lectures

- `GET /api/lectures` - Get all lectures
- `POST /api/lectures` - Create lecture
- `PUT /api/lectures/:id` - Update lecture
- `DELETE /api/lectures/:id` - Delete lecture

### Attendance

- `GET /api/attendance` - Get attendance records
- `POST /api/attendance` - Mark attendance
- `PUT /api/attendance/:id` - Update attendance
- `DELETE /api/attendance/:id` - Delete attendance record

### Assignments

- `GET /api/assignments` - Get assignments
- `POST /api/assignments` - Create assignment
- `PUT /api/assignments/:id` - Update assignment
- `DELETE /api/assignments/:id` - Delete assignment

## 🐳 Deployment

### Docker (Recommended)

```bash
# Build and run with Docker Compose
docker-compose up -d

# Or manually
docker build -t studysphere .
docker run -p 8080:8080 studysphere
```

### Platform Deployments

- **Netlify** - Configured with `netlify.toml`
- **Railway/Render** - Node.js application
- **DigitalOcean** - Docker container

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions.

## 🔒 Security Features

- JWT token authentication
- Password hashing with bcrypt
- CORS protection
- Input validation and sanitization
- SQL injection prevention
- XSS protection

## 📊 Database Schema

### Users

- Authentication and user profiles
- Encrypted passwords
- Session management

### Lectures

- Class scheduling and information
- Subject categorization
- Schedule tracking

### Attendance

- Date-based attendance records
- Status tracking (Present/Absent/Cancelled)
- Automatic percentage calculation

### Assignments

- Task management with priorities
- Due date tracking
- Status management

## 🎯 Performance Features

- Optimized React components with lazy loading
- Efficient database queries
- Image optimization
- Code splitting
- Gzip compression
- CDN-ready static assets

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Type checking
npm run typecheck
```

## ⚠️ Known Warnings

**Recharts Library Warnings**: You may see console warnings about `defaultProps` being deprecated in React function components. These warnings come from the Recharts library (v2.12.7) and don't affect functionality. They're suppressed in production builds.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📈 Future Enhancements

- [ ] Mobile app with React Native
- [ ] Real-time notifications
- [ ] Calendar integration
- [ ] Grade tracking
- [ ] Study groups and collaboration
- [ ] Export to PDF reports
- [ ] Email reminders
- [ ] Advanced analytics

## 🔗 MCP Integrations

StudySphere supports integration with these MCP servers via Builder.io:

- **Neon/Prisma** - PostgreSQL database for production
- **Sentry** - Error monitoring and performance tracking
- **Netlify** - Deployment and hosting
- **Linear** - Project management and issue tracking
- **Notion** - Documentation and note-taking

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Support

For support, email support@studysphere.com or join our Discord community.

---

**Built with ❤️ by the StudySphere Team**
