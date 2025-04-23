const express = require('express');
const router = express.Router();
const { verifyJWT } = require('../middleware/verifyJWT');
const { generateToken } = require('../middleware/csrfProtection');

/**
 * Security event logger endpoint
 * Records suspicious activity for security monitoring
 */
router.post('/log-event', verifyJWT, (req, res) => {
  const { type, details } = req.body;
  const timestamp = new Date().toISOString();
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  const userAgent = req.headers['user-agent'] || 'unknown';
  
  // Log the security event
  console.warn('SECURITY EVENT:', {
    type,
    details,
    user: req.user?.email || 'unknown',
    timestamp,
    ip,
    userAgent
  });
  
  // In a production environment, you would:
  // 1. Store this in a security database
  // 2. Set up alerts for suspicious patterns
  // 3. Potentially block the user or IP for repeated violations
  
  // Send a generic response to avoid leaking information
  res.status(200).json({ received: true });
});

/**
 * Verify admin status endpoint
 * Used for double-checking admin privileges from the client
 */
router.get('/verify-admin', verifyJWT, (req, res) => {
  // The user info comes from the verifyJWT middleware
  const isAdmin = req.user?.role === 'admin';
  
  res.json({ isAdmin });
});

/**
 * Generate a fresh CSRF token
 * Useful when the client needs to refresh their CSRF token
 */
router.get('/csrf', generateToken, (req, res) => {
  res.json({ success: true, message: 'CSRF token generated' });
});

// Simple endpoint to get a CSRF token
router.get('/csrf-token', generateToken, (req, res) => {
  res.json({ message: 'CSRF token set in cookie' });
});

module.exports = router; 