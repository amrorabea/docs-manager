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

        const foundUser = await User.findOne({ email: email }).exec();
        
        // Always run bcrypt compare to maintain consistent timing
        let match = false;
        if (foundUser) {
            match = await bcrypt.compare(password, foundUser.password);
        }
        
        if (match && foundUser) {
            // Create access token
            const accessToken = jwt.sign(
                {
                    "email": foundUser.email,
                    "name": foundUser.name,
                    "role": foundUser.role
                },
                process.env.ACCESS_TOKEN_SECRET,
                { expiresIn: '30m' }
            );
            
            // Create refresh token
            const refreshToken = jwt.sign(
                { "email": foundUser.email },
                process.env.REFRESH_TOKEN_SECRET,
                { expiresIn: '1d' }
            );

            // Save refresh token to user in DB
            foundUser.refreshToken = refreshToken;
            await foundUser.save();

            // Set refresh token in HTTP-only cookie
            res.cookie('jwt', refreshToken, { 
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 24 * 60 * 60 * 1000 // 1 day
            });

            // Send access token and user info
            return res.json({ 
                accessToken,
                user: {
                    email: foundUser.email,
                    name: foundUser.name,
                    role: foundUser.role
                }
            });
        }
        
        return res.status(401).json({ message: 'Invalid credentials' });
        
    } catch (err) {
        console.error('Login error:', err);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

module.exports = { handleLogin };