/**
 * Error Handler Utility
 * Provides standardized error handling and response formatting
 */

const logger = require('./logger');

/**
 * Custom API Error class with status code
 */
class APIError extends Error {
  constructor(message, statusCode = 500, details = null) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Common error types for consistent responses
 */
const ErrorTypes = {
  BAD_REQUEST: (message = 'Invalid request data', details = null) => 
    new APIError(message, 400, details),
  
  UNAUTHORIZED: (message = 'Authentication required', details = null) => 
    new APIError(message, 401, details),
  
  FORBIDDEN: (message = 'Access denied', details = null) => 
    new APIError(message, 403, details),
  
  NOT_FOUND: (message = 'Resource not found', details = null) => 
    new APIError(message, 404, details),
  
  CONFLICT: (message = 'Resource conflict', details = null) => 
    new APIError(message, 409, details),
  
  TOO_MANY_REQUESTS: (message = 'Rate limit exceeded', details = null) => 
    new APIError(message, 429, details),
  
  INTERNAL_ERROR: (message = 'Internal server error', details = null) => 
    new APIError(message, 500, details),
  
  VALIDATION_ERROR: (errors) => 
    new APIError('Validation failed', 400, { errors })
};

/**
 * Format error response consistently
 */
const formatErrorResponse = (err, includeStack = false) => {
  const response = {
    status: 'error',
    message: err.message || 'An unexpected error occurred'
  };

  if (err.details) {
    response.details = err.details;
  }

  if (includeStack && err.stack) {
    response.stack = err.stack.split('\n');
  }

  return response;
};

/**
 * Global error handling middleware
 */
const errorMiddleware = (err, req, res, next) => {
  // Default to 500 internal server error
  const statusCode = err.statusCode || 500;
  
  // Log all errors
  const logMethod = statusCode >= 500 ? 'error' : 'warn';
  logger[logMethod](`${statusCode} - ${err.message}`, {
    error: err.name,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    user: req.user?.email || 'anonymous'
  });
  
  // Include stack trace in development
  const includeStack = process.env.NODE_ENV === 'development';
  
  // Send error response
  res.status(statusCode).json(
    formatErrorResponse(err, includeStack)
  );
};

/**
 * Async error handler to avoid try/catch in route handlers
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Handle uncaught exceptions and unhandled rejections
 */
const setupGlobalErrorHandlers = () => {
  // Handle uncaught exceptions
  process.on('uncaughtException', (err) => {
    logger.error('UNCAUGHT EXCEPTION', {
      error: err.message,
      stack: err.stack
    });
    
    // Give the logger time to write before exiting
    setTimeout(() => {
      process.exit(1);
    }, 1000);
  });
  
  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('UNHANDLED REJECTION', {
      reason: reason?.message || reason,
      stack: reason?.stack
    });
  });
};

module.exports = {
  APIError,
  ErrorTypes,
  formatErrorResponse,
  errorMiddleware,
  asyncHandler,
  setupGlobalErrorHandlers
}; 