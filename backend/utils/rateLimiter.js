/**
 * Rate Limiting Utility
 * Provides enhanced rate limiting functionality with advanced options
 */

const rateLimit = require('express-rate-limit');
const logger = require('./logger');
const { ErrorTypes } = require('./errorHandler');

/**
 * Create a standard rate limiter for most API endpoints
 * @param {number} maxRequests - Max requests per window
 * @param {number} windowMs - Time window in milliseconds
 * @param {string} endpointType - Type of endpoint for logging
 */
const createRateLimiter = (maxRequests = 100, windowMs = 15 * 60 * 1000, endpointType = 'general') => {
  return rateLimit({
    windowMs,
    max: maxRequests,
    standardHeaders: true,
    legacyHeaders: false,
    // Use a more reliable IP identification approach
    keyGenerator: (req) => {
      const ip = req.ip || 
                req.headers['x-forwarded-for'] || 
                req.socket.remoteAddress || 
                'unknown';
                
      // For authenticated users, include user ID in the key
      if (req.user && req.user.email) {
        return `${ip}:${req.user.email}`;
      }
      
      return ip;
    },
    // Log and return standardized error
    handler: (req, res, next, options) => {
      const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
      
      logger.security('Rate limit exceeded', {
        ip,
        endpoint: req.originalUrl,
        method: req.method,
        userAgent: req.headers['user-agent'],
        endpointType
      });

      const error = ErrorTypes.TOO_MANY_REQUESTS(
        `Too many requests from this IP, please try again after ${Math.ceil(windowMs / 60000)} minutes`
      );
      
      res.status(429).json({
        status: 'error',
        message: error.message,
        retryAfter: Math.ceil(windowMs / 1000)
      });
    },
    // Skip rate limiting for trusted IPs or paths
    skip: (req) => {
      // Skip for health check and static files
      if (req.path.includes('/health') || 
          req.path.startsWith('/uploads/') || 
          req.path.includes('.ico')) {
        return true;
      }
      
      // Skip for trusted IPs (internal/local)
      const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
      if (ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.')) {
        return true;
      }
      
      return false;
    }
  });
};

/**
 * Stricter rate limiter for authentication endpoints
 * Provides extra protection against brute force attacks
 */
const authLimiter = createRateLimiter(20, 10 * 60 * 1000, 'auth');

/**
 * Even stricter limiter for sensitive operations
 */
const sensitiveOpLimiter = createRateLimiter(5, 60 * 60 * 1000, 'sensitive');

/**
 * Higher limits for read-only operations
 */
const readOnlyLimiter = createRateLimiter(300, 15 * 60 * 1000, 'read-only');

/**
 * Advanced brute force detection with IP tracking
 * Keeps track of consecutive failures and escalates blocking
 */
class BruteForceProtection {
  constructor() {
    this.failedAttempts = new Map();
    this.blockedIPs = new Map();
    
    // Clean up every hour
    setInterval(() => this.cleanup(), 60 * 60 * 1000);
  }
  
  /**
   * Record a failed login attempt
   * @param {string} ip - Client IP address
   * @param {string} identifier - Username or email attempted
   */
  recordFailure(ip, identifier) {
    const key = `${ip}:${identifier}`;
    const attempts = this.failedAttempts.get(key) || 0;
    this.failedAttempts.set(key, attempts + 1);
    
    logger.security('Failed login attempt', { ip, identifier, attempts: attempts + 1 });
    
    // Block IP after too many failures
    if (attempts + 1 >= 5) {
      const blockDuration = Math.min(30 * 60 * 1000 * Math.pow(2, Math.floor(attempts / 5)), 24 * 60 * 60 * 1000);
      this.blockedIPs.set(ip, Date.now() + blockDuration);
      
      logger.security('IP blocked due to too many failed login attempts', { 
        ip, 
        identifier, 
        blockDuration: Math.ceil(blockDuration / 60000) + ' minutes' 
      });
    }
  }
  
  /**
   * Record a successful login attempt
   * @param {string} ip - Client IP address
   * @param {string} identifier - Username or email 
   */
  recordSuccess(ip, identifier) {
    const key = `${ip}:${identifier}`;
    this.failedAttempts.delete(key);
  }
  
  /**
   * Check if an IP is blocked
   * @param {string} ip - Client IP address
   * @returns {boolean} Whether the IP is blocked
   */
  isBlocked(ip) {
    if (!this.blockedIPs.has(ip)) return false;
    
    const blockedUntil = this.blockedIPs.get(ip);
    if (Date.now() > blockedUntil) {
      this.blockedIPs.delete(ip);
      return false;
    }
    
    return true;
  }
  
  /**
   * Get remaining block time in seconds
   * @param {string} ip - Client IP address
   * @returns {number} Seconds remaining or 0 if not blocked
   */
  getBlockTimeRemaining(ip) {
    if (!this.blockedIPs.has(ip)) return 0;
    
    const blockedUntil = this.blockedIPs.get(ip);
    const remaining = blockedUntil - Date.now();
    
    return remaining > 0 ? Math.ceil(remaining / 1000) : 0;
  }
  
  /**
   * Cleanup expired records
   */
  cleanup() {
    const now = Date.now();
    
    // Clean up blocked IPs
    for (const [ip, blockedUntil] of this.blockedIPs.entries()) {
      if (now > blockedUntil) {
        this.blockedIPs.delete(ip);
      }
    }
    
    // Clean up failed attempts older than 12 hours
    const twelveHoursAgo = now - 12 * 60 * 60 * 1000;
    for (const key of this.failedAttempts.keys()) {
      if (this.failedAttempts.get(key).timestamp < twelveHoursAgo) {
        this.failedAttempts.delete(key);
      }
    }
  }
  
  /**
   * Middleware to check for blocked IPs
   */
  middleware() {
    return (req, res, next) => {
      const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
      
      if (this.isBlocked(ip)) {
        const remainingSeconds = this.getBlockTimeRemaining(ip);
        
        logger.security('Blocked IP attempted access', { 
          ip, 
          url: req.originalUrl, 
          method: req.method,
          remainingSeconds
        });
        
        return res.status(429).json({
          status: 'error',
          message: 'Too many failed attempts, please try again later',
          retryAfter: remainingSeconds
        });
      }
      
      next();
    };
  }
}

// Create a global instance
const bruteForceProtection = new BruteForceProtection();

module.exports = {
  createRateLimiter,
  authLimiter,
  sensitiveOpLimiter,
  readOnlyLimiter,
  bruteForceProtection
}; 