/**
 * Security Utility
 * Provides various security functions for the application
 */

const crypto = require('crypto');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const logger = require('./logger');
const { ErrorTypes } = require('./errorHandler');

/**
 * Constant-time string comparison to prevent timing attacks
 * @param {string} a - First string
 * @param {string} b - Second string
 * @returns {boolean} Whether strings match
 */
const constantTimeCompare = (a, b) => {
  if (!a || !b) return false;
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  
  try {
    // Ensure buffers are the same length
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b.padEnd(a.length).slice(0, a.length));
    
    return crypto.timingSafeEqual(bufA, bufB);
  } catch (err) {
    logger.error('Error in constant-time comparison', { error: err.message });
    return false;
  }
};

/**
 * Generate a secure random token
 * @param {number} length - Length of token in bytes
 * @returns {string} Hex-encoded token
 */
const generateRandomToken = (length = 32) => {
  return crypto.randomBytes(length).toString('hex');
};

/**
 * Hash a password securely
 * @param {string} password - Plain text password
 * @returns {Promise<string>} Hashed password
 */
const hashPassword = async (password) => {
  // Change the salt rounds as needed (higher is more secure but slower)
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
};

/**
 * Compare a password with a hash
 * @param {string} password - Plain text password
 * @param {string} hash - Hashed password
 * @returns {Promise<boolean>} Whether password matches hash
 */
const comparePassword = async (password, hash) => {
  return await bcrypt.compare(password, hash);
};

/**
 * Generate a JWT token
 * @param {Object} payload - Token payload
 * @param {string} secret - Secret to sign token with
 * @param {Object} options - JWT options
 * @returns {string} Signed JWT token
 */
const generateJWT = (payload, secret, options = {}) => {
  return jwt.sign(payload, secret, {
    expiresIn: '30m', // Default 30 minutes
    ...options
  });
};

/**
 * Verify a JWT token
 * @param {string} token - JWT token to verify
 * @param {string} secret - Secret used to sign token
 * @returns {Promise<Object>} Decoded token payload
 * @throws {Error} If token is invalid
 */
const verifyJWT = (token, secret) => {
  return new Promise((resolve, reject) => {
    jwt.verify(token, secret, (err, decoded) => {
      if (err) {
        logger.warn('JWT verification failed', { 
          error: err.message, 
          tokenType: err.name 
        });
        reject(ErrorTypes.UNAUTHORIZED('Invalid token'));
      } else {
        resolve(decoded);
      }
    });
  });
};

/**
 * Validate payload structure against expected schema
 * @param {Object} payload - Payload to validate
 * @param {Object} schema - Expected schema with field types
 * @returns {Object} Object with isValid flag and errors if any
 */
const validatePayload = (payload, schema) => {
  if (!payload || typeof payload !== 'object') {
    return { isValid: false, errors: ['Invalid payload'] };
  }
  
  const errors = [];
  
  for (const [field, requirements] of Object.entries(schema)) {
    // Check required fields
    if (requirements.required && (payload[field] === undefined || payload[field] === null)) {
      errors.push(`Missing required field: ${field}`);
      continue;
    }
    
    // Skip further checks if field is not provided and not required
    if (payload[field] === undefined || payload[field] === null) {
      continue;
    }
    
    // Type checking
    if (requirements.type) {
      let typeValid = false;
      
      switch (requirements.type) {
        case 'string':
          typeValid = typeof payload[field] === 'string';
          break;
        case 'number':
          typeValid = typeof payload[field] === 'number' && !isNaN(payload[field]);
          break;
        case 'boolean':
          typeValid = typeof payload[field] === 'boolean';
          break;
        case 'array':
          typeValid = Array.isArray(payload[field]);
          break;
        case 'object':
          typeValid = typeof payload[field] === 'object' && !Array.isArray(payload[field]);
          break;
        case 'date':
          typeValid = !isNaN(Date.parse(payload[field]));
          break;
      }
      
      if (!typeValid) {
        errors.push(`Field ${field} should be of type ${requirements.type}`);
      }
    }
    
    // Validate string length
    if (typeof payload[field] === 'string') {
      if (requirements.minLength && payload[field].length < requirements.minLength) {
        errors.push(`Field ${field} should be at least ${requirements.minLength} characters`);
      }
      
      if (requirements.maxLength && payload[field].length > requirements.maxLength) {
        errors.push(`Field ${field} should not exceed ${requirements.maxLength} characters`);
      }
    }
    
    // Validate arrays
    if (Array.isArray(payload[field])) {
      if (requirements.minItems && payload[field].length < requirements.minItems) {
        errors.push(`Field ${field} should have at least ${requirements.minItems} items`);
      }
      
      if (requirements.maxItems && payload[field].length > requirements.maxItems) {
        errors.push(`Field ${field} should not have more than ${requirements.maxItems} items`);
      }
    }
    
    // Validate against regex pattern
    if (requirements.pattern && typeof payload[field] === 'string') {
      if (!requirements.pattern.test(payload[field])) {
        errors.push(`Field ${field} has an invalid format`);
      }
    }
    
    // Custom validation function
    if (requirements.validate && typeof requirements.validate === 'function') {
      const result = requirements.validate(payload[field]);
      if (result !== true) {
        errors.push(result);
      }
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Generate a secure nonce for CSP and other security headers
 * @returns {string} Base64 encoded nonce
 */
const generateNonce = () => {
  return crypto.randomBytes(16).toString('base64');
};

/**
 * Sanitize user input to prevent XSS attacks
 * @param {string} input - User input to sanitize
 * @returns {string} Sanitized input
 */
const sanitizeUserInput = (input) => {
  if (!input || typeof input !== 'string') return '';
  
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .replace(/`/g, '&#96;');
};

/**
 * Check if a value seems to contain an injection attack pattern
 * @param {string} value - Value to check
 * @returns {boolean} Whether value contains suspicious patterns
 */
const containsInjectionPattern = (value) => {
  if (!value || typeof value !== 'string') return false;
  
  const sqlPatterns = /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|ALTER|UNION|INTO|WHERE)\b.*?=|;|--)/i;
  const scriptPatterns = /<script\b[^>]*>.*?<\/script>|javascript:|on\w+=/i;
  const maliciousPatterns = /(eval\(|document\.cookie|localStorage|sessionStorage|indexedDB)/i;
  
  return sqlPatterns.test(value) || scriptPatterns.test(value) || maliciousPatterns.test(value);
};

module.exports = {
  constantTimeCompare,
  generateRandomToken,
  hashPassword,
  comparePassword,
  generateJWT,
  verifyJWT,
  validatePayload,
  generateNonce,
  sanitizeUserInput,
  containsInjectionPattern
}; 