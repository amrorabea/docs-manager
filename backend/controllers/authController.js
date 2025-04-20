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
        // create JWTs
        const accessToken = jwt.sign(
            {
                "email": foundEmail.email
            },
            process.env.ACCESS_TOKEN_SECRET,
            { expiresIn: '5m' }
        );
        const refreshToken = jwt.sign(
            {
                "email": foundEmail.email
            },
            process.env.REFRESH_TOKEN_SECRET,
            { expiresIn: '1d' }
        );
        // Saving refreshToken with current user
        foundEmail.refreshToken = refreshToken;
        const result = await foundEmail.save();
        console.log(result);

        // Creates Secure Cookie with refresh token
        res.cookie('jwt', refreshToken, { httpOnly: true, secure: true, sameSite: 'None', maxAge: 24 * 60 * 60 * 1000 });

        // Send authorization access token to user
        res.json({ accessToken });

    } else {
        res.status(400).json({ 'message': 'password are required.' });
    }
}

module.exports = { handleLogin };