const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

const handleLogin = async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ 'message': 'email and password are required.' });

    const foundEmail = await User.findOne({ email: email }).exec();
    if (!foundEmail) return res.sendStatus(401); //Unauthorized
    const match = await bcrypt.compare(password, foundEmail.password);
    if (match) {
        // create JWTs with user data including role
        const accessToken = jwt.sign(
            {
                "email": foundEmail.email,
                "name": foundEmail.name,
                "role": foundEmail.role,
                "isAdmin": foundEmail.role === 'admin'
            },
            process.env.ACCESS_TOKEN_SECRET,
            { expiresIn: '60m' }
        );
        const refreshToken = jwt.sign(
            {
                "email": foundEmail.email,
                "role": foundEmail.role
            },
            process.env.REFRESH_TOKEN_SECRET,
            { expiresIn: '2d' }
        );
        // Saving refreshToken with current user
        foundEmail.refreshToken = refreshToken;
        const result = await foundEmail.save();
        console.log(result);

        // Creates Secure Cookie with refresh token
        res.cookie('jwt', refreshToken, { httpOnly: true, secure: true, sameSite: 'None', maxAge: 2 * 24 * 60 * 60 * 1000 });

        // Send authorization access token to user
        res.json({ 
            accessToken,
            user: {
                email: foundEmail.email,
                name: foundEmail.name,
                role: foundEmail.role,
                isAdmin: foundEmail.role === 'admin'
            }
        });

    } else {
        res.status(400).json({ 'message': 'password are required.' });
    }
}

module.exports = { handleLogin };