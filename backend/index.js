const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const verifyJWT = require('./middleware/verifyJWT');
require('dotenv').config();
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const path = require('path');

const app = express();

// Security middleware
app.use(helmet());
app.use(compression());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use(express.json());

const PORT = process.env.PORT || 5000;

// Improved MongoDB connection
mongoose.connect(process.env.MONGO_URI, {
  maxPoolSize: 10,
  minPoolSize: 5,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
})
  .then(() => {
    console.log('MongoDB connected successfully');
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
    
    // Initialize scheduled tasks
    const { initScheduledTasks } = require('./scheduledTasks');
    initScheduledTasks();
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

// Import routes
const policyAPI = require('./routes/api/policyAPI');
const departmentAPI = require('./routes/api/departmentAPI');
const userAPI = require('./routes/api/userAPI');

const rootRoutes = require('./routes/rootRoute');
const registerRoutes = require('./routes/registerRoute');
const authRoutes = require('./routes/authRoute');
const refreshRoutes = require('./routes/refreshRoute');
const logoutRoutes = require('./routes/logoutRoute');

// Public routes
app.use('/', rootRoutes);
app.use('/register', registerRoutes);
app.use('/auth', authRoutes);
app.use('/refresh', refreshRoutes);
app.use('/logout', logoutRoutes);

// JWT verification middleware for protected routes
app.use(verifyJWT.verifyJWT);

// Protected routes
app.use('/api/policies', policyAPI);
app.use('/api/departments', departmentAPI);
app.use('/api/users', userAPI);

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    message: 'An unexpected error occurred', 
    error: process.env.NODE_ENV === 'development' ? err.message : undefined 
  });
});

// Handle unmatched routes
app.use((req, res) => {
  res.status(404).json({ message: 'Resource not found' });
});

