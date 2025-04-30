/**
 * Rate Limiter Middleware
 * Protects against brute force attacks by limiting request frequency
 */

// Simple in-memory store for rate limiting (use Redis in production)
const requestStore = {};

/**
 * Helper to clean up old requests to prevent memory leaks
 */
const cleanupOldRequests = () => {
  const now = Date.now();
  for (const ip in requestStore) {
    const requests = requestStore[ip].filter(time => now - time < 60 * 60 * 1000); // Remove requests older than 1 hour
    
    if (requests.length === 0) {
      delete requestStore[ip];
    } else {
      requestStore[ip] = requests;
    }
  }
};

// Store interval handles for cleanup on shutdown
let cleanupOldRequestsInterval = setInterval(cleanupOldRequests, 60 * 60 * 1000);
let cleanupFailuresInterval; // Ensure this is defined at the top level

/**
 * Rate limit by IP address
 * @param {number} maxRequests - Maximum number of requests allowed in the time window
 * @param {number} windowMs - Time window in milliseconds
 */
exports.ipRateLimiter = (maxRequests = 100, windowMs = 15 * 60 * 1000) => {
  return (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    
    // Initialize request array for this IP if it doesn't exist
    if (!requestStore[ip]) {
      requestStore[ip] = [];
    }
    
    // Current time
    const now = Date.now();
    
    // Filter out requests that are outside the time window
    const recentRequests = requestStore[ip].filter(time => now - time < windowMs);
    
    // Update the requests array
    requestStore[ip] = recentRequests;
    
    // Check if the IP has made too many requests
    if (recentRequests.length >= maxRequests) {
      return res.status(429).json({ 
        status: 'error',
        message: 'Too many requests, please try again later',
        retryAfter: Math.ceil(windowMs / 1000 / 60) // minutes
      });
    }
    
    // Add current request timestamp
    requestStore[ip].push(now);
    
    next();
  };
};

/**
 * Stricter rate limit for sensitive routes like login
 * @param {number} maxRequests - Maximum number of requests allowed in the time window
 * @param {number} windowMs - Time window in milliseconds
 */
exports.loginRateLimiter = (maxRequests = 5, windowMs = 5 * 60 * 1000) => {
  return (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const endpoint = `${ip}:login`;
    
    // Initialize request array for this IP+endpoint if it doesn't exist
    if (!requestStore[endpoint]) {
      requestStore[endpoint] = [];
    }
    
    // Current time
    const now = Date.now();
    
    // Filter out requests that are outside the time window
    const recentRequests = requestStore[endpoint].filter(time => now - time < windowMs);
    
    // Update the requests array
    requestStore[endpoint] = recentRequests;
    
    // Check if the IP has made too many login attempts
    if (recentRequests.length >= maxRequests) {
      return res.status(429).json({ 
        status: 'error',
        message: 'Too many login attempts, please try again later',
        retryAfter: Math.ceil(windowMs / 1000 / 60) // minutes
      });
    }
    
    // Add current request timestamp
    requestStore[endpoint].push(now);
    
    next();
  };
};

/**
 * Advanced brute force protection for authentication endpoints
 * Implements exponential backoff based on failed attempts
 * @param {Object} options - Configuration options
 */
exports.bruteForceProtection = (options = {}) => {
  // Track failed attempts by IP and username
  const failedAttempts = new Map();
  
  // Default options
  const config = {
    maxConsecutiveFailures: options.maxConsecutiveFailures || 5,
    initialBlockDuration: options.initialBlockDuration || 5 * 60 * 1000, // 5 minutes
    maxBlockDuration: options.maxBlockDuration || 24 * 60 * 60 * 1000, // 24 hours
    failureWindow: options.failureWindow || 30 * 60 * 1000, // 30 minutes
  };
  
  // Store interval handle for cleanup
  cleanupFailuresInterval = setInterval(() => {
    const now = Date.now();
    failedAttempts.forEach((data, key) => {
      if (now - data.lastFailure > config.failureWindow) {
        failedAttempts.delete(key);
      }
    });
  }, 15 * 60 * 1000); // Run every 15 minutes
  
  return (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const username = req.body.email || req.body.username || 'unknown';
    
    // Create unique keys for tracking
    const ipKey = `ip:${ip}`;
    const usernameKey = `user:${username}`;
    const combinedKey = `${ip}:${username}`;
    
    // Check if IP or username is currently blocked
    const checkBlocked = (key) => {
      const data = failedAttempts.get(key);
      if (!data) return false;
      
      const now = Date.now();
      if (data.blockedUntil && now < data.blockedUntil) {
        // Calculate remaining block time
        const remainingSecs = Math.ceil((data.blockedUntil - now) / 1000);
        return remainingSecs;
      }
      
      return false;
    };
    
    // Check if any of the identifiers are blocked
    const ipBlock = checkBlocked(ipKey);
    const usernameBlock = checkBlocked(usernameKey);
    const combinedBlock = checkBlocked(combinedKey);
    
    if (ipBlock || usernameBlock || combinedBlock) {
      // Use the longest remaining block time
      const longestBlock = Math.max(ipBlock || 0, usernameBlock || 0, combinedBlock || 0);
      
      return res.status(429).json({
        status: 'error',
        message: 'Too many failed login attempts. Please try again later.',
        retryAfter: longestBlock
      });
    }
    
    // Add middleware to track login failures
    res.on('finish', () => {
      // Only track failed login attempts (401 status)
      if (res.statusCode === 401) {
        const updateFailures = (key) => {
          let data = failedAttempts.get(key) || { 
            count: 0, 
            lastFailure: 0,
            blockedUntil: null
          };
          
          data.count += 1;
          data.lastFailure = Date.now();
          
          // Check if we should block this identifier
          if (data.count >= config.maxConsecutiveFailures) {
            // Exponential backoff: each block doubles in duration, up to maxBlockDuration
            // Example: 5, 10, 20, 40, ... minutes
            const blockMultiplier = Math.pow(2, Math.floor(data.count / config.maxConsecutiveFailures) - 1);
            const blockDuration = Math.min(
              config.initialBlockDuration * blockMultiplier,
              config.maxBlockDuration
            );
            
            data.blockedUntil = Date.now() + blockDuration;
            console.warn(`Blocking ${key} for ${blockDuration/1000} seconds due to ${data.count} failed attempts`);
          }
          
          failedAttempts.set(key, data);
        };
        
        // Update all tracking keys
        updateFailures(ipKey);
        updateFailures(usernameKey);
        updateFailures(combinedKey);
      }
      
      // Reset counters on successful login
      if (res.statusCode === 200) {
        [ipKey, usernameKey, combinedKey].forEach(key => {
          if (failedAttempts.has(key)) {
            failedAttempts.delete(key);
          }
        });
      }
    });
    
    next();
  };
};

// Optional: export interval handles for cleanup on shutdown
exports._intervalHandles = { cleanupOldRequestsInterval, cleanupFailuresInterval };