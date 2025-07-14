# StudySphere - Production Deployment Guide

## Netlify Deployment

StudySphere is configured for seamless deployment on Netlify with serverless functions.

### Quick Deploy to Netlify

1. **Fork/Clone the Repository**

   ```bash
   git clone https://github.com/your-username/studysphere.git
   cd studysphere
   ```

2. **Install Dependencies**

   ```bash
   npm install
   ```

3. **Build for Production**

   ```bash
   npm run build:netlify
   ```

4. **Deploy to Netlify**
   - Connect your GitHub repository to Netlify
   - Set build command: `npm run build:netlify`
   - Set publish directory: `dist/spa`
   - Deploy!

### Environment Variables

No environment variables are required for basic deployment. The app uses SQLite database which is created automatically.

### Features in Production

- ✅ User registration and authentication
- ✅ Full CRUD operations for lectures, attendance, and assignments
- ✅ Real-time dashboard with charts and analytics
- ✅ Responsive design for all devices
- ✅ Dark/light mode theme support
- ✅ Secure JWT authentication
- ✅ Data persistence with SQLite
- 📱 **Progressive Web App (PWA) Support**
  - ✅ Install as native mobile app
  - ✅ Offline functionality with service worker
  - ✅ Full-screen standalone mode
  - ✅ App shortcuts for quick access
  - ✅ Native mobile experience

### First Time Setup

1. Navigate to your deployed application
2. Click "Sign Up" to create your account
3. Start adding your lectures and tracking attendance
4. Create assignments and manage your academic progress

### 📱 Installing as Mobile App

**On Mobile Devices:**

1. Open StudySphere in your mobile browser
2. Look for the "Install App" prompt that appears
3. Tap "Install" to add StudySphere to your home screen
4. Open the app from your home screen for a native experience

**On Desktop:**

1. Open StudySphere in Chrome/Edge
2. Look for the install icon in the address bar
3. Click "Install StudySphere"
4. The app will open in its own window

**Features when installed:**

- ✅ Full-screen experience without browser UI
- ✅ Home screen icon and app shortcuts
- ✅ Offline functionality
- ✅ Push notifications (future feature)
- ✅ Faster loading with cached resources

### Alternative Deployment Options

#### Docker Deployment

```bash
npm run docker:build
npm run docker:run
```

#### Traditional Server Deployment

```bash
npm run build:production
npm start:production
```

### Development vs Production

- **Development**: Includes demo data and credentials for quick testing
- **Production**: Clean slate, ready for real user data
- **No Demo Data**: Production builds do not include any demo accounts or sample data

### Support

For deployment issues or questions, please check the main README.md or create an issue in the repository.

---

**Note**: The production build automatically removes all demo data and credentials. Users must register their own accounts to use the application.
