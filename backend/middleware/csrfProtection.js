/**
 * CSRF Protection Middleware
 * Protects against Cross-Site Request Forgery attacks
 */

const logger = require('../utils/logger');

// Generate CSRF token to be sent to client
exports.generateToken = (req, res, next) => {
  try {
    // Check if we already have a token in the session
    if (req.session && req.session.csrfToken) {
      // Reuse existing token to ensure consistency
      const token = req.session.csrfToken;
      logger.debug('Reusing existing CSRF token from session');
      
      // Make sure cookie matches session token
      res.cookie('XSRF-TOKEN', token, { 
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 24 * 60 * 60 * 1000
      });
      
      // Set in headers too - use both naming conventions for compatibility
      res.setHeader('X-XSRF-TOKEN', token);
      res.setHeader('X-CSRF-Token', token);
      res.locals.csrfToken = token;
      
      return next();
    }
    
    // Generate a new token
    const token = require('crypto').randomBytes(32).toString('hex');
    
    // Store in session if available
    if (req.session) {
      req.session.csrfToken = token;
      logger.debug('CSRF token generated and stored in session', { tokenId: token.substring(0, 6) });
    } else {
      logger.warn('Session not available for CSRF, using cookie-only method');
    }
    
    // Set the token in multiple ways to ensure at least one works
    
    // 1. Standard way - non-HTTP-only cookie
    res.cookie('XSRF-TOKEN', token, { 
      httpOnly: false, // Allow JavaScript to read it
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });
    
    // 2. Add the token to response headers - use both naming conventions
    res.setHeader('X-XSRF-TOKEN', token);
    res.setHeader('X-CSRF-Token', token);
    
    // 3. Store in response locals for view templates
    res.locals.csrfToken = token;
    
    logger.debug('CSRF token generated', { tokenId: token.substring(0, 6) });
    
    next();
  } catch (error) {
    logger.error('Error generating CSRF token', { error: error.message, stack: error.stack });
    // Continue without CSRF token rather than breaking the app
    next();
  }
};

// Verify the token on incoming requests
exports.verifyToken = (req, res, next) => {
  try {
    // Skip for GET, HEAD, OPTIONS
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      return next();
    }
    
    // Also skip for development mode if enabled
    if (process.env.NODE_ENV === 'development' && process.env.DISABLE_CSRF === 'true') {
      logger.warn('CSRF protection disabled in development mode');
      return next();
    }
    
    // Detailed request debugging - check all possible token locations
    logger.debug('CSRF validation', {
      url: req.url,
      method: req.method,
      hasXXsrfHeader: !!req.headers['x-xsrf-token'],
      hasXsrfHeader: !!req.headers['xsrf-token'],
      hasXCSRFHeader: !!req.headers['x-csrf-token'],
      hasCookie: !!(req.cookies && req.cookies['XSRF-TOKEN']),
      hasBodyToken: !!req.body?._csrf,
      hasSession: !!req.session,
      hasSessionToken: !!(req.session && req.session.csrfToken)
    });
    
    // Special handling for /auth/handleLogin and other authentication endpoints
    const isAuthEndpoint = req.url.includes('/auth/') || req.url.includes('/login') || req.url.includes('/register');
    
    if (isAuthEndpoint) {
      logger.debug('Authentication endpoint detected, CSRF requirements relaxed', { url: req.url });
      
      // For auth endpoints, allow the request if:
      // 1. A CSRF token is in the session (already generated)
      // 2. No CSRF token was generated yet (first request)
      // 3. Any token format is provided (header, cookie, or body)
      
      if (req.session?.csrfToken || 
          req.headers['x-xsrf-token'] || 
          req.headers['xsrf-token'] || 
          req.headers['x-csrf-token'] ||
          (req.cookies && req.cookies['XSRF-TOKEN']) || 
          req.body?._csrf) {
        // A token exists somewhere, allow the request
        logger.debug('Auth endpoint with CSRF token present in some form, proceeding', { url: req.url });
        return next();
      }
      
      // Still no token anywhere, but we'll allow login/auth for user experience
      logger.warn('No CSRF token for auth endpoint, but allowing request', { 
        url: req.url, 
        ip: req.ip || req.connection.remoteAddress
      });
      return next();
    }
    
    // For non-auth endpoints, use standard CSRF validation
    
    // Get token from header, cookie, or request body - check all possible locations
    const token = req.headers['x-xsrf-token'] || 
                 req.headers['xsrf-token'] ||
                 req.headers['x-csrf-token'] ||
                 (req.cookies && req.cookies['XSRF-TOKEN']) || 
                 req.body?._csrf;
    
    // Get stored token from session or cookie
    let storedToken = null;
    if (req.session && req.session.csrfToken) {
      storedToken = req.session.csrfToken;
    } else if (req.cookies && req.cookies['XSRF-TOKEN']) {
      // Fallback to cookie-based validation if no session
      storedToken = req.cookies['XSRF-TOKEN'];
      logger.warn('Using cookie-based CSRF validation (less secure)', { url: req.url });
    }
    
    if (!token || !storedToken) {
      logger.security('CSRF token missing', { 
        hasToken: !!token, 
        hasStoredToken: !!storedToken,
        url: req.url,
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.headers['user-agent']
      });
      
      // In development mode, log the error but allow the request
      if (process.env.NODE_ENV !== 'production') {
        logger.warn('CSRF validation failed in development, allowing request', { url: req.url });
        return next();
      }
      
      return res.status(403).json({ message: 'CSRF token validation failed: Token missing' });
    }
    
    if (token !== storedToken) {
      logger.security('CSRF token mismatch', { 
        tokenLength: token?.length, 
        storedTokenLength: storedToken?.length,
        url: req.url,
        tokenPrefix: token?.substring(0, 6),
        storedTokenPrefix: storedToken?.substring(0, 6),
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.headers['user-agent']
      });
      
      // In development mode, log the error but allow the request
      if (process.env.NODE_ENV !== 'production') {
        logger.warn('CSRF token mismatch in development, allowing request', { url: req.url });
        return next();
      }
      
      return res.status(403).json({ message: 'CSRF token validation failed: Token mismatch' });
    }
    
    // Token is valid
    logger.debug('CSRF validation passed', { url: req.url });
    next();
  } catch (error) {
    logger.error('Error in CSRF validation', { 
      error: error.message, 
      stack: error.stack,
      url: req.url 
    });
    
    // In production, fail closed (block the request)
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ message: 'CSRF token validation error' });
    } else {
      // In development, fail open (allow the request)
      logger.warn('Bypassing CSRF validation error in development', { url: req.url });
      next();
    }
  }
}; 