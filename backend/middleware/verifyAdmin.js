const jwt = require('jsonwebtoken');

/**
 * Middleware to verify if the user has admin role
 * Must be used after verifyJWT middleware
 */
exports.verifyAdmin = (req, res, next) => {
    // Simple check if user already set by verifyJWT
    if (req.user && req.user.role === 'admin') {
        return next();
    }

    // Otherwise verify from token again
    const authHeader = req.headers.authorization || req.headers.Authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Unauthorized: No token provided' });
    }
    
    const token = authHeader.split(' ')[1];
    
    jwt.verify(
        token,
        process.env.ACCESS_TOKEN_SECRET,
        (err, decoded) => {
            if (err) {
                console.error('Token verification failed:', err.message);
                return res.status(403).json({ message: 'Forbidden: Invalid token' });
            }
            
            // Check if user has admin role
            if (!decoded.role || decoded.role !== 'admin') {
                return res.status(403).json({ message: 'Forbidden: Admin access required' });
            }
            
            // Pass the user info to the next middleware
            req.user = {
                email: decoded.email,
                role: decoded.role
            };
            
            next();
        }
    );
}; 