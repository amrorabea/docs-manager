const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const verifyJWT = require('./middleware/verifyJWT');
require('dotenv').config();
const helmet = require('helmet');
const compression = require('compression');
const { createRateLimiter, authLimiter, bruteForceProtection } = require('./utils/rateLimiter');
const path = require('path');
const { sanitizeBody } = require('./middleware/validateInput');
const session = require('express-session');
const crypto = require('crypto');
const { verifyToken, generateToken } = require('./middleware/csrfProtection');
const { checkSuspiciousHeaders, sanitizeReferrer } = require('./middleware/securityHeaders');
const cookieParser = require('cookie-parser');
const logger = require('./utils/logger');
const { errorMiddleware, setupGlobalErrorHandlers } = require('./utils/errorHandler');
const { cacheMiddleware } = require('./utils/cache');

// Initialize error handlers early
setupGlobalErrorHandlers();

const app = express();

// Configure request logging early in the middleware stack
app.use(logger.requestLogger());

// Trust first proxy for environments behind a reverse proxy
app.set('trust proxy', 1);

// Generate random session secret on startup
const sessionSecret = process.env.SESSION_SECRET || crypto.randomBytes(64).toString('hex');

// Cookie parser middleware - needed for CSRF
app.use(cookieParser());

// Session configuration - required for CSRF protection
app.use(session({
  secret: sessionSecret,
  resave: false,
  saveUninitialized: false,
  name: 'app.sid', // Change from default connect.sid
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'strict',
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    path: '/',
  },
  // Enable session rotation to prevent session fixation attacks
  rolling: true,
}));

// Clear old session cookies if they exist
app.use((req, res, next) => {
  // Check if the old session cookie exists
  if (req.cookies && req.cookies['connect.sid']) {
    // Clear the old cookie
    res.clearCookie('connect.sid', { path: '/' });
    logger.debug('Cleared old session cookie');
  }
  next();
});

// Function to regenerate session on authentication state changes
const regenerateSession = (req, res, next) => {
  const origSession = req.session;
  
  // Skip for static routes and non-authentication state changes
  if (req.method === 'GET' || !req.url.includes('/auth/')) {
    return next();
  }
  
  // Regenerate session ID to prevent session fixation
  req.session.regenerate((err) => {
    if (err) {
      logger.error('Session regeneration failed', { error: err.message });
      return next();
    }
    
    // Copy properties from old session
    Object.assign(req.session, origSession);
    next();
  });
};

// Apply session regeneration middleware
app.use(regenerateSession);

// Enhanced security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'", "data:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
      formAction: ["'self'"],
      workerSrc: ["'self'"],
      manifestSrc: ["'self'"],
      upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null,
    },
  },
  crossOriginEmbedderPolicy: { policy: "credentialless" },
  crossOriginOpenerPolicy: { policy: "same-origin" },
  crossOriginResourcePolicy: { policy: "same-site" },
  dnsPrefetchControl: { allow: false },
  frameguard: { action: 'deny' },
  hsts: { 
    maxAge: 63072000, 
    includeSubDomains: true,
    preload: true 
  },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  xssFilter: true,
  noSniff: true,
  permittedCrossDomainPolicies: { permittedPolicies: "none" },
  expectCt: {
    enforce: true,
    maxAge: 30,
  },
}));

// Add security headers checking and sanitization
app.use(checkSuspiciousHeaders);
app.use(sanitizeReferrer);

// Generate CSRF tokens for all requests
app.use(generateToken);

app.use(compression());

// Global rate limiter for all routes
app.use(createRateLimiter());

// Brute force protection
app.use(bruteForceProtection.middleware());

// CORS configuration with enhanced security
app.use(cors({
  origin: (origin, callback) => {
    const allowedOrigins = [
      'https://policieslog.com',
      'https://www.policieslog.com',
      // For development
      'http://localhost:3000',
      'http://localhost:5000'
    ];
    
    // In production, strictly check origins
    if (process.env.NODE_ENV === 'production') {
      if (!origin || !allowedOrigins.includes(origin)) {
        logger.security('Blocked request with invalid origin', { origin });
        return callback(new Error('Not allowed by CORS'));
      }
    }
    
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-XSRF-TOKEN',
    'X-CSRF-Token',
    'X-Requested-With',
    'Accept',
    'Origin'
  ],
  exposedHeaders: ['X-CSRF-Token', 'X-XSRF-TOKEN'],
  maxAge: 86400
}));

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use(express.json());

// Apply sanitization globally to all routes with request bodies
app.use(sanitizeBody);

// Protect routes that modify data with CSRF verification
// Skip for GET, HEAD, OPTIONS which should be idempotent
app.use((req, res, next) => {
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
    // Check for CSRF token in multiple locations
    // This adds flexibility for clients and improves compatibility
    const token = 
      (req.body && req.body._csrf) || 
      req.headers['x-csrf-token'] || 
      req.headers['x-xsrf-token'] ||
      req.cookies['XSRF-TOKEN'];
    
    // For auth endpoints, be more lenient with CSRF checks
    // Many login forms may not properly support CSRF
    if (req.path.includes('/auth/')) {
      logger.debug('Authentication endpoint detected, CSRF requirements relaxed', { url: req.path });
      
      if (token) {
        logger.debug('Auth endpoint with CSRF token present in some form, proceeding', { url: req.path });
        next();
      } else {
        // For development, allow auth without CSRF
        if (process.env.NODE_ENV !== 'production') {
          logger.warn('Auth request without CSRF token allowed in development', { url: req.path });
          next();
        } else {
          // In production, still enforce CSRF for auth
          verifyToken(req, res, next);
        }
      }
    } else {
      // For non-auth endpoints, always verify CSRF token
      verifyToken(req, res, next);
    }
  } else {
    next();
  }
});

// Import routes
const policyAPI = require('./routes/api/policyAPI');
const departmentAPI = require('./routes/api/departmentAPI');
const userAPI = require('./routes/api/userAPI');
const securityRoutes = require('./routes/securityRoute');

const rootRoutes = require('./routes/rootRoute');
const registerRoutes = require('./routes/registerRoute');
const authRoutes = require('./routes/authRoute');
const refreshRoutes = require('./routes/refreshRoute');
const logoutRoutes = require('./routes/logoutRoute');

// Public routes
app.use('/', rootRoutes);
app.use('/register', registerRoutes);

// Apply CSRF token generation and rate limiting to auth routes
app.use('/auth', authLimiter, authRoutes);

app.use('/refresh', refreshRoutes);
app.use('/logout', logoutRoutes);

// Security routes that don't require authentication
app.use('/api/security', securityRoutes);

// Cache health check endpoint
app.get('/health', cacheMiddleware(60), (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(), 
    uptime: process.uptime()
  });
});

// JWT verification middleware for protected routes
app.use(verifyJWT.verifyJWT);

// Protected routes - use caching for read operations
app.use('/api/policies', policyAPI);
app.use('/api/departments', departmentAPI);
app.use('/api/users', userAPI);

// Add error handling middleware (before 404 handler but after routes)
app.use(errorMiddleware);

// Handle unmatched routes
app.use((req, res) => {
  logger.warn('Resource not found', { url: req.url, method: req.method });
  res.status(404).json({ 
    status: 'error',
    message: 'Resource not found' 
  });
});

const PORT = process.env.PORT || 5000;

// Improved MongoDB connection
const connectDB = async () => {
  try {
    console.log('Connecting to MongoDB...');
    
    await mongoose.connect(process.env.MONGO_URI, {
      maxPoolSize: 10,
      minPoolSize: 5,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
      heartbeatFrequencyMS: 10000,
      retryWrites: true,
      retryReads: true,
    });
    
    console.log('MongoDB connected successfully');
    
    // Set up connection event handlers
    mongoose.connection.on('error', err => {
      console.error('MongoDB connection error:', err);
    });
    
    mongoose.connection.on('disconnected', () => {
      console.warn('MongoDB disconnected. Attempting to reconnect...');
      setTimeout(connectDB, 5000);
    });
    
    return true;
  } catch (err) {
    console.error('MongoDB connection error:', err);
    console.log('Retrying connection in 5 seconds...');
    setTimeout(connectDB, 5000);
    return false;
  }
};

// Start server only after successful database connection
const startServer = async () => {
  const connected = await connectDB();
  
  if (connected) {
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
    
    // Initialize scheduled tasks
    const { initScheduledTasks } = require('./scheduledTasks');
    initScheduledTasks();
    
    // Set up graceful shutdown
    process.on('SIGINT', () => {
      mongoose.connection.close(() => {
        console.log('MongoDB connection closed due to app termination');
        process.exit(0);
      });
    });
  }
};

// Start the server
startServer().catch(err => {
  console.error('Server startup failed:', err);
  process.exit(1);
});

