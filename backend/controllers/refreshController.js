const User = require('../models/User');
const jwt = require('jsonwebtoken');

const handleRefreshToken = async (req, res) => {
    const cookies = req.cookies;
    if (!cookies?.jwt) return res.sendStatus(401);
    const refreshToken = cookies.jwt;

    const foundEmail = await User.findOne({ refreshToken }).exec();
    if (!foundEmail) return res.sendStatus(403); //Forbidden
    // evaluate jwt
    jwt.verify(
        refreshToken,
        process.env.REFRESH_TOKEN_SECRET,
        (err, decoded) => {
            if (err || foundEmail.email !== decoded.email) return res.sendStatus(403);
            const accessToken = jwt.sign(
                {
                    "email": foundEmail.email
                },
                process.env.ACCESS_TOKEN_SECRET,
                { expiresIn: '5m' }
            );
            res.json({ accessToken })
        }
    );
}

module.exports = { handleRefreshToken }