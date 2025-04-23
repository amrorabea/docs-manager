/**
 * Security Headers Middleware
 * Validates incoming headers for security issues and logs suspicious activity
 */

// List of suspicious header values that might indicate attacks
const suspiciousPatterns = [
  /(<|%3C)script(>|%3E)/i,  // Basic XSS pattern
  /javascript:/i,           // JavaScript protocol
  /data:/i,                 // Data URI scheme
  /document\.cookie/i,      // Cookie theft attempts
  /eval\(/i,                // Eval usage
  /union\s+select/i,        // SQL injection
  /\/etc\/passwd/i,         // Directory traversal
  /\.\.\/\.\.\//i,          // Path traversal
  /select.+from.+where/i,   // SQL query
  /onload=/i,               // Event handler
  /onerror=/i,              // Event handler
  /\/bin\/bash/i,           // Command injection
  /exec\(/i,                // Command execution
  /system\(/i,              // Command execution
];

/**
 * Checks if a string contains any suspicious patterns
 * @param {string} value - String to check
 * @returns {boolean} - Whether the string contains suspicious patterns
 */
const containsSuspiciousPattern = (value) => {
  if (!value || typeof value !== 'string') return false;
  
  return suspiciousPatterns.some(pattern => pattern.test(value));
};

/**
 * Middleware to check for suspicious headers and parameter values
 */
exports.checkSuspiciousHeaders = (req, res, next) => {
  // Track suspicious items to log
  const suspiciousItems = [];
  
  // Check headers for suspicious patterns
  Object.entries(req.headers).forEach(([name, value]) => {
    // Skip certain headers like authorization which might have encoded data
    if (['authorization', 'cookie'].includes(name.toLowerCase())) {
      return;
    }
    
    if (containsSuspiciousPattern(value)) {
      suspiciousItems.push({
        type: 'header',
        name,
        value: value.substring(0, 100), // Limit logging length
      });
    }
  });
  
  // Check query parameters
  Object.entries(req.query).forEach(([name, value]) => {
    if (containsSuspiciousPattern(value)) {
      suspiciousItems.push({
        type: 'query',
        name,
        value: value.substring(0, 100), // Limit logging length
      });
    }
  });
  
  // Log suspicious activity
  if (suspiciousItems.length > 0) {
    console.warn('SECURITY WARNING: Suspicious request parameters detected', {
      ip: req.ip || req.connection.remoteAddress,
      method: req.method,
      path: req.path,
      userAgent: req.headers['user-agent'] || 'unknown',
      items: suspiciousItems,
      timestamp: new Date().toISOString(),
    });
    
    // In a real production environment, you might want to:
    // 1. Store this in a security database/log
    // 2. Increment a counter for the IP
    // 3. Block the IP if too many suspicious requests are detected
  }
  
  next();
};

/**
 * Middleware to sanitize HTTP referrer information for privacy
 * Helps prevent leaking sensitive information in the Referer header
 */
exports.sanitizeReferrer = (req, res, next) => {
  // Add Referrer-Policy header to all responses
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
}; 