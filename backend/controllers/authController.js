const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

/**
 * Constant-time comparison utility to prevent timing attacks
 * @param {string} a - First string to compare
 * @param {string} b - Second string to compare
 * @returns {boolean} - Whether the strings match
 */
const secureCompare = (a, b) => {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  return crypto.timingSafeEqual(
    Buffer.from(a, 'utf8'), 
    Buffer.from(b.padEnd(a.length).slice(0, a.length), 'utf8')
  );
};

const handleLogin = async (req, res) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ 
                message: 'Email and password are required' 
            });
        }

        // Find user - avoiding timing attacks by not returning early
        const foundUser = await User.findOne({ email: email }).exec();
        
        // Always run bcrypt compare to maintain consistent timing
        // regardless of whether user exists
        let match = false;
        if (foundUser) {
            match = await bcrypt.compare(password, foundUser.password);
        } else {
            // Dummy comparison to maintain consistent response time
            await bcrypt.compare(password, '$2b$10$MBCUiE3i5GZLTZ7/yxgTM.XXV1vLEAMWB64WMlgMJ/y0J3YJJt1e.');
        }
        
        if (match && foundUser) {
            // User authenticated successfully
            
            // Create JWTs with user data including role
            const accessToken = jwt.sign(
                {
                    "email": foundUser.email,
                    "name": foundUser.name,
                    "role": foundUser.role
                },
                process.env.ACCESS_TOKEN_SECRET,
                { expiresIn: '30m' } // Shortened token lifetime for security
            );
            
            const refreshToken = jwt.sign(
                {
                    "email": foundUser.email,
                    "role": foundUser.role
                },
                process.env.REFRESH_TOKEN_SECRET,
                { expiresIn: '2d' }
            );
            
            // Saving refreshToken with current user
            foundUser.refreshToken = refreshToken;
            await foundUser.save();

            // Set secure cookie with refresh token
            res.cookie('jwt', refreshToken, { 
                httpOnly: true, 
                secure: process.env.NODE_ENV === 'production', 
                sameSite: 'strict',
                maxAge: 2 * 24 * 60 * 60 * 1000 // 2 days
            });

            // Send authorization access token to user
            return res.json({ 
                accessToken,
                user: {
                    email: foundUser.email,
                    name: foundUser.name,
                    role: foundUser.role
                }
            });
        } else {
            // Authentication failed - generic message to avoid user enumeration
            return res.status(401).json({ 
                message: 'Invalid credentials' 
            });
        }
    } catch (error) {
        console.error('Login error:', error);
        return res.status(500).json({ 
            message: 'An error occurred during authentication' 
        });
    }
};

module.exports = { handleLogin };