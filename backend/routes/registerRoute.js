const express = require('express');
const router = express.Router();
const registerController = require('../controllers/registerController');
const { loginRateLimiter } = require('../middleware/rateLimiter');
const { sanitizeBody, validateRegistration } = require('../middleware/validateInput');
const { generateToken } = require('../middleware/csrfProtection');

// Apply multiple middlewares for security
// Rate limit, sanitize, validate, and add CSRF protection
router.post('/handleNewUser', 
  loginRateLimiter(10, 60 * 60 * 1000), // 10 registrations per hour
  sanitizeBody,
  validateRegistration,
  generateToken,
  registerController.handleNewUser
);

module.exports = router;