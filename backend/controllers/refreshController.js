const User = require('../models/User');
const jwt = require('jsonwebtoken');

const handleRefreshToken = async (req, res) => {
    console.log('Refresh token request received');
    
    // Check if we have a jwt cookie
    const cookies = req.cookies;
    if (!cookies?.jwt) {
        console.log('No refresh token cookie found');
        return res.sendStatus(401); // Unauthorized
    }
    
    const refreshToken = cookies.jwt;
    console.log('Refresh token found, verifying...');

    try {
        // Find user with this refresh token
        const foundEmail = await User.findOne({ refreshToken }).exec();
        if (!foundEmail) {
            console.log('Refresh token not found in database');
            // Clear the invalid cookie
            res.clearCookie('jwt', { httpOnly: true, sameSite: 'None', secure: true });
            res.clearCookie('jwt', { httpOnly: true, sameSite: 'Lax' });
            res.clearCookie('jwt', { httpOnly: true });
            res.clearCookie('jwt');
            return res.sendStatus(403); // Forbidden
        }
        
        // Verify the refresh token
        jwt.verify(
            refreshToken,
            process.env.REFRESH_TOKEN_SECRET,
            (err, decoded) => {
                if (err || foundEmail.email !== decoded.email) {
                    console.log('Invalid refresh token or token/user mismatch');
                    // Clear the invalid cookie
                    res.clearCookie('jwt', { httpOnly: true, sameSite: 'None', secure: true });
                    res.clearCookie('jwt', { httpOnly: true, sameSite: 'Lax' });
                    res.clearCookie('jwt', { httpOnly: true });
                    res.clearCookie('jwt');
                    return res.sendStatus(403); // Forbidden
                }
                
                console.log('Refresh token valid, creating new access token');
                // Create new access token
                const accessToken = jwt.sign(
                    {
                        "email": foundEmail.email,
                        "name": foundEmail.name,
                        "role": foundEmail.role,
                        "isAdmin": foundEmail.role === 'admin'
                    },
                    process.env.ACCESS_TOKEN_SECRET,
                    { expiresIn: '5m' }
                );
                
                console.log('New access token created');
                res.json({ 
                    accessToken,
                    user: {
                        email: foundEmail.email,
                        name: foundEmail.name,
                        role: foundEmail.role,
                        isAdmin: foundEmail.role === 'admin'
                    }
                });
            }
        );
    } catch (error) {
        console.error('Error in refresh token processing:', error);
        return res.sendStatus(500); // Internal server error
    }
}

module.exports = { handleRefreshToken }