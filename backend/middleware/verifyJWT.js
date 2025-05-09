const jwt = require('jsonwebtoken');

exports.verifyJWT = (req, res, next) => {
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
            
            // Add more user information to the request
            req.user = {
                email: decoded.email,
                role: decoded.role || 'user' // Default to 'user' if role not specified
            };
            
            next();
        }
    );
}