const jwt = require('jsonwebtoken');

/**
 * Generates an Access Token for the user.
 * 
 * We keep access tokens remarkably short-lived (e.g. 15 minutes) so that if one is compromised,
 * it becomes useless quickly. The Access Token inherently carries the tenant scope (organization_id)
 * embedded within, preventing a user from faking their tenant data.
 */
const generateAccessToken = (user) => {
    return jwt.sign(
        { 
            id: user.id, 
            email: user.email, 
            role: user.role, 
            organization_id: user.organization_id 
        },
        process.env.JWT_SECRET || 'super_secret_access_key123',
        { expiresIn: '15m' }
    );
};

/**
 * Generates a Refresh Token.
 * 
 * This token validates for much longer (e.g., 7 days) and is strictly used to automatically request 
 * brand new Access Tokens silently under the hood without forcing the user to log in repeatedly.
 */
const generateRefreshToken = (user) => {
    return jwt.sign(
        { id: user.id },
        process.env.JWT_REFRESH_SECRET || 'super_secret_refresh_key123',
        { expiresIn: '7d' }
    );
};

module.exports = {
    generateAccessToken,
    generateRefreshToken
};
