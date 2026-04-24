/**
 * Authentication Middleware
 * 
 * Validates the JSON Web Token (JWT) sent by the frontend, ensuring the request 
 * is coming from an authenticated, logged-in user.
 */
const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
    // Extract the header (expects Format: 'Bearer TOKEN_STRING')
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ success: false, message: 'Access denied. No token provided.' });
    }

    try {
        // Attempt to decrypt and verify the token
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'super_secret_access_key123');
        
        // Success! Attach the fully decoded payload securely to the request logic
        // This makes `req.user.organization_id` and `req.user.role` available to all future controllers
        req.user = decoded;
        
        next(); // Proceed to the actual route handler
    } catch (err) {
        // Token might be tampered with or simply expired
        return res.status(403).json({ success: false, message: 'Invalid or expired token.' });
    }
};

module.exports = authenticateToken;
