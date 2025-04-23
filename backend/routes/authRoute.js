const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { loginRateLimiter, bruteForceProtection } = require('../middleware/rateLimiter');
const { generateToken } = require('../middleware/csrfProtection');
const { sanitizeBody, validateLogin } = require('../middleware/validateInput');

// Apply middlewares in order:
// 1. Basic rate limiter to prevent general abuse
// 2. Advanced brute force protection with exponential backoff
// 3. Sanitize the input to prevent XSS
// 4. Validate input format
// 5. Generate CSRF token
// 6. Handle login
router.post('/handleLogin', 
  loginRateLimiter(10, 15 * 60 * 1000), // 10 attempts per 15 mins (general rate limiting)
  bruteForceProtection({
    maxConsecutiveFailures: 5,         // Block after 5 failed attempts
    initialBlockDuration: 5 * 60 * 1000,  // Start with 5 minute blocks
    maxBlockDuration: 24 * 60 * 60 * 1000 // Maximum block of 24 hours
  }),
  sanitizeBody,
  validateLogin,
  generateToken, 
  authController.handleLogin
);

module.exports = router;