/**
 * Input Validation Middleware
 * Provides functions to sanitize and validate inputs
 */

/**
 * Validate email format with stricter regex
 * @param {string} email - Email to validate
 * @returns {boolean} Whether the email is valid
 */
const isValidEmail = (email) => {
  if (!email) return false;
  
  // More restrictive email regex with better validation
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  
  // Check length - emails should be reasonably sized
  if (email.length > 320) return false; // Standard max email length
  
  return emailRegex.test(String(email).toLowerCase());
};

/**
 * Sanitize a string to prevent XSS attacks
 * @param {string} str - String to sanitize
 * @returns {string} Sanitized string
 */
const sanitizeString = (str) => {
  if (!str) return '';
  
  // First, ensure we're working with a string
  const stringValue = String(str);
  
  // Check for suspiciously long inputs
  if (stringValue.length > 10000) {
    console.warn('Extremely long string detected, potential DoS attempt');
    return '[Oversized input removed]';
  }
  
  return stringValue
    // Replace HTML special chars with entities
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    // Remove potentially dangerous patterns
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '')
    .replace(/data:/gi, '')
    .replace(/vbscript:/gi, '')
    .replace(/expression\(/gi, '')
    .replace(/eval\(/gi, '')
    .replace(/url\(/gi, '')
    .replace(/\bfunction\s*\(/gi, '')
    .trim();
};

/**
 * Sanitize an object by cleaning all string properties
 * @param {object} obj - Object to sanitize
 * @returns {object} Sanitized object
 */
const sanitizeObject = (obj) => {
  if (!obj || typeof obj !== 'object') return obj;
  
  // Prevent prototype pollution - only check direct property access
  // This reduces false positives while maintaining security
  if (
    (Object.prototype.hasOwnProperty.call(obj, '__proto__') && typeof obj.__proto__ === 'object') || 
    (Object.prototype.hasOwnProperty.call(obj, 'constructor') && typeof obj.constructor !== 'function') ||
    (Object.prototype.hasOwnProperty.call(obj, 'prototype') && obj.prototype && typeof obj.prototype === 'object')
  ) {
    console.warn('Potential prototype pollution attempt detected', { 
      hasProto: Object.prototype.hasOwnProperty.call(obj, '__proto__'),
      hasConstructor: Object.prototype.hasOwnProperty.call(obj, 'constructor'),
      hasPrototype: Object.prototype.hasOwnProperty.call(obj, 'prototype')
    });
    // Remove only the dangerous properties rather than rejecting the entire object
    const safeObj = { ...obj };
    delete safeObj.__proto__;
    delete safeObj.constructor;
    delete safeObj.prototype;
    return sanitizeObject(safeObj);
  }
  
  const sanitized = {};
  
  for (const key in obj) {
    // Skip inherited properties
    if (!Object.prototype.hasOwnProperty.call(obj, key)) continue;
    
    // Sanitize object keys too
    const sanitizedKey = sanitizeString(key);
    
    if (typeof obj[key] === 'string') {
      sanitized[sanitizedKey] = sanitizeString(obj[key]);
    } else if (Array.isArray(obj[key])) {
      // Handle arrays - map sanitization to each element
      sanitized[sanitizedKey] = obj[key].map(item => 
        typeof item === 'object' ? sanitizeObject(item) :
        typeof item === 'string' ? sanitizeString(item) : item
      );
      
      // Ensure array is not too large
      if (sanitized[sanitizedKey].length > 1000) {
        console.warn(`Large array detected in key ${sanitizedKey}`);
        sanitized[sanitizedKey] = sanitized[sanitizedKey].slice(0, 1000);
      }
    } else if (typeof obj[key] === 'object' && obj[key] !== null) {
      sanitized[sanitizedKey] = sanitizeObject(obj[key]);
    } else {
      sanitized[sanitizedKey] = obj[key];
    }
  }
  
  return sanitized;
};

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @returns {object} Validation result with isValid and reason
 */
const validatePasswordStrength = (password) => {
  if (!password) {
    return { isValid: false, reason: 'Password is required' };
  }
  
  if (password.length < 8) {
    return { isValid: false, reason: 'Password must be at least 8 characters long' };
  }
  
  // Check for common password patterns
  const commonPasswords = ['password', '12345678', 'qwerty', 'admin123'];
  if (commonPasswords.includes(password.toLowerCase())) {
    return { isValid: false, reason: 'Password is too common' };
  }
  
  // Check for complexity - at least 3 of the following:
  // Uppercase, lowercase, numbers, special characters
  let complexity = 0;
  if (/[A-Z]/.test(password)) complexity++;
  if (/[a-z]/.test(password)) complexity++;
  if (/[0-9]/.test(password)) complexity++;
  if (/[^A-Za-z0-9]/.test(password)) complexity++;
  
  if (complexity < 3) {
    return { 
      isValid: false, 
      reason: 'Password must include at least 3 of the following: uppercase letters, lowercase letters, numbers, special characters' 
    };
  }
  
  return { isValid: true };
};

/**
 * Middleware to sanitize request body
 */
exports.sanitizeBody = (req, res, next) => {
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }
  
  // Also sanitize query parameters
  if (req.query) {
    req.query = sanitizeObject(req.query);
  }
  
  // And URL parameters
  if (req.params) {
    req.params = sanitizeObject(req.params);
  }
  
  next();
};

/**
 * Middleware to validate user registration input
 */
exports.validateRegistration = (req, res, next) => {
  const { name, email, password } = req.body;
  
  const errors = [];
  
  // Validate name
  if (!name || typeof name !== 'string') {
    errors.push('Name is required');
  } else if (name.length < 2) {
    errors.push('Name must be at least 2 characters long');
  } else if (name.length > 100) {
    errors.push('Name is too long (maximum 100 characters)');
  }
  
  // Validate email
  if (!email || !isValidEmail(email)) {
    errors.push('A valid email address is required');
  }
  
  // Validate password
  const passwordValidation = validatePasswordStrength(password);
  if (!passwordValidation.isValid) {
    errors.push(passwordValidation.reason);
  }
  
  if (errors.length > 0) {
    return res.status(400).json({ message: 'Validation failed', errors });
  }
  
  next();
};

/**
 * Middleware to validate login input
 */
exports.validateLogin = (req, res, next) => {
  const { email, password } = req.body;
  
  const errors = [];
  
  if (!email || !isValidEmail(email)) {
    errors.push('A valid email address is required');
  }
  
  if (!password) {
    errors.push('Password is required');
  }
  
  // Check for rate limiting or brute force (handled separately)
  
  if (errors.length > 0) {
    return res.status(400).json({ message: 'Validation failed', errors });
  }
  
  next();
};

/**
 * General purpose validation middleware factory for any endpoint
 * @param {object} schema - Validation rules
 * @returns {Function} Middleware function
 */
exports.createValidator = (schema) => {
  return (req, res, next) => {
    const errors = [];
    
    for (const field in schema) {
      const rules = schema[field];
      const value = req.body[field];
      
      // Required check
      if (rules.required && (value === undefined || value === null || value === '')) {
        errors.push(`${field} is required`);
        continue;
      }
      
      // Skip other validations if field is not present and not required
      if ((value === undefined || value === null) && !rules.required) {
        continue;
      }
      
      // Type check
      if (rules.type) {
        const validType = 
          (rules.type === 'string' && typeof value === 'string') ||
          (rules.type === 'number' && typeof value === 'number' && !isNaN(value)) ||
          (rules.type === 'boolean' && typeof value === 'boolean') ||
          (rules.type === 'array' && Array.isArray(value)) ||
          (rules.type === 'object' && typeof value === 'object' && !Array.isArray(value) && value !== null);
        
        if (!validType) {
          errors.push(`${field} should be a ${rules.type}`);
          continue;
        }
      }
      
      // Min/max length for strings and arrays
      if ((typeof value === 'string' || Array.isArray(value)) && rules.minLength !== undefined && value.length < rules.minLength) {
        errors.push(`${field} should be at least ${rules.minLength} characters long`);
      }
      
      if ((typeof value === 'string' || Array.isArray(value)) && rules.maxLength !== undefined && value.length > rules.maxLength) {
        errors.push(`${field} should not exceed ${rules.maxLength} characters`);
      }
      
      // Min/max value for numbers
      if (typeof value === 'number') {
        if (rules.min !== undefined && value < rules.min) {
          errors.push(`${field} should be at least ${rules.min}`);
        }
        
        if (rules.max !== undefined && value > rules.max) {
          errors.push(`${field} should not exceed ${rules.max}`);
        }
      }
      
      // Pattern matching
      if (typeof value === 'string' && rules.pattern) {
        if (!rules.pattern.test(value)) {
          errors.push(rules.message || `${field} has an invalid format`);
        }
      }
      
      // Custom validation
      if (rules.validate && typeof rules.validate === 'function') {
        const validationResult = rules.validate(value);
        if (validationResult !== true) {
          errors.push(validationResult);
        }
      }
    }
    
    if (errors.length > 0) {
      return res.status(400).json({ message: 'Validation failed', errors });
    }
    
    next();
  };
}; 