const User = require('../models/User');

/**
 * Helper function to clear all possible auth cookies with various settings
 */
const clearAllAuthCookies = (res) => {
    // Clear jwt cookie with all possible configurations
    res.clearCookie('jwt', { httpOnly: true, sameSite: 'None', secure: true });
    res.clearCookie('jwt', { httpOnly: true, sameSite: 'Lax' });
    res.clearCookie('jwt', { httpOnly: true });
    res.clearCookie('jwt');
    
    // Clear token cookie with all possible configurations
    res.clearCookie('token', { httpOnly: true, sameSite: 'None', secure: true });
    res.clearCookie('token', { httpOnly: true, sameSite: 'Lax' });
    res.clearCookie('token', { httpOnly: true });
    res.clearCookie('token');
    
    // Clear any other potential auth cookies
    res.clearCookie('auth');
    res.clearCookie('session');
    res.clearCookie('refresh_token');
    res.clearCookie('access_token');
    res.clearCookie('id_token');
};

const handleLogout = async (req, res) => {
    // On client, also delete the accessToken and clear the local storage after logout

    const cookies = req.cookies;
    if (!cookies?.jwt) return res.sendStatus(204); //No content
    const refreshToken = cookies.jwt;

    // Is refreshToken in db?
    const foundEmail = await User.findOne({ refreshToken }).exec();
    if (!foundEmail) {
        // Clear all auth cookies
        clearAllAuthCookies(res);
        return res.sendStatus(204);
    }

    // Delete refreshToken in db
    foundEmail.refreshToken = '';
    const result = await foundEmail.save();
    console.log(result);

    // Clear all auth cookies
    clearAllAuthCookies(res);
    
    res.sendStatus(204);
}

module.exports = { handleLogout }