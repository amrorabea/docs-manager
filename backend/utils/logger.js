/**
 * Logger Utility
 * Provides consistent structured logging across the application
 */

const fs = require('fs');
const path = require('path');

// Ensure logs directory exists
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Create log streams
const errorStream = fs.createWriteStream(
  path.join(logsDir, 'error.log'), 
  { flags: 'a' }
);

const accessStream = fs.createWriteStream(
  path.join(logsDir, 'access.log'), 
  { flags: 'a' }
);

const securityStream = fs.createWriteStream(
  path.join(logsDir, 'security.log'), 
  { flags: 'a' }
);

/**
 * Format a log entry with timestamp and other metadata
 */
const formatLogEntry = (level, message, meta = {}) => {
  const timestamp = new Date().toISOString();
  return JSON.stringify({
    timestamp,
    level,
    message,
    ...meta
  }) + '\n';
};

/**
 * Write to console and appropriate log file
 */
const writeLog = (level, message, meta = {}, stream = null) => {
  const entry = formatLogEntry(level, message, meta);
  
  // Always log to console in appropriate color
  if (level === 'error') {
    console.error('\x1b[31m%s\x1b[0m', entry); // Red
  } else if (level === 'warn') {
    console.warn('\x1b[33m%s\x1b[0m', entry); // Yellow
  } else if (level === 'security') {
    console.log('\x1b[35m%s\x1b[0m', entry); // Magenta for security
  } else if (level === 'debug') {
    console.debug('\x1b[36m%s\x1b[0m', entry); // Cyan
  } else {
    console.log('\x1b[32m%s\x1b[0m', entry); // Green
  }
  
  // Write to file if stream provided
  if (stream) {
    stream.write(entry);
  }
};

/**
 * Logger object with different log levels
 */
const logger = {
  error: (message, meta = {}) => {
    writeLog('error', message, meta, errorStream);
  },
  
  warn: (message, meta = {}) => {
    writeLog('warn', message, meta, errorStream);
  },
  
  info: (message, meta = {}) => {
    writeLog('info', message, meta, accessStream);
  },
  
  debug: (message, meta = {}) => {
    // Only log debug in development
    if (process.env.NODE_ENV !== 'production') {
      writeLog('debug', message, meta);
    }
  },
  
  security: (message, meta = {}) => {
    writeLog('security', message, meta, securityStream);
  },
  
  access: (req, res, responseTime) => {
    const meta = {
      method: req.method,
      url: req.url,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'],
      status: res.statusCode,
      responseTime
    };
    
    // Add user info if available
    if (req.user) {
      meta.user = req.user.email || 'unknown';
      meta.role = req.user.role || 'unknown';
    }
    
    writeLog('access', 'API Request', meta, accessStream);
  },
  
  // Create middleware for logging requests
  requestLogger: () => {
    return (req, res, next) => {
      const start = Date.now();
      
      // Add response listener to log after request completes
      res.on('finish', () => {
        const responseTime = Date.now() - start;
        logger.access(req, res, responseTime);
      });
      
      next();
    };
  }
};

module.exports = logger; 