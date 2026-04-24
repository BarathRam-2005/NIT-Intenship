/**
 * Auth Controller
 * 
 * Handles all logic for Registration, Login, and generating the necessary JWTs.
 * Includes Google OAuth native flow and transactional database handling to ensure data integrity.
 */
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { generateAccessToken, generateRefreshToken } = require('../utils/jwt');
const { OAuth2Client } = require('google-auth-library');

// We use google-auth-library to securely verify the idToken sent by our React frontend.
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID || 'dummy-client-id');

/**
 * Normal Registration: Creates a brand new Organization AND an Admin user simultaneously.
 */
exports.register = async (req, res, next) => {
    try {
        const { orgName, userName, email, password } = req.body;

        // Use a SQL Transaction! If creating the user fails, it rolls back the organization creation.
        const dbClient = await db.pool.connect();
        try {
            await dbClient.query('BEGIN');

            const existingUser = await dbClient.query('SELECT id FROM users WHERE email = $1', [email]);
            if (existingUser.rows.length > 0) {
                await dbClient.query('ROLLBACK');
                return res.status(400).json({ success: false, message: 'Email already registered.' });
            }

            // Step 1: Create Organization
            const orgResult = await dbClient.query(
                `INSERT INTO organizations (name) VALUES ($1) RETURNING id`,
                [orgName]
            );
            const orgId = orgResult.rows[0].id;

            // Step 2: Hash password (never store plain text!)
            const passwordHash = await bcrypt.hash(password, 10);

            // Step 3: Create Admin User attached to new Org
            const userResult = await dbClient.query(
                `INSERT INTO users (organization_id, name, email, password_hash, role) 
                 VALUES ($1, $2, $3, $4, 'ADMIN') RETURNING *`,
                [orgId, userName, email, passwordHash]
            );

            await dbClient.query('COMMIT'); // Persist transaction
            
            const user = userResult.rows[0];
            const accessToken = generateAccessToken(user);
            const refreshToken = generateRefreshToken(user);

            res.status(201).json({ 
                success: true, 
                accessToken, 
                refreshToken, 
                user: { id: user.id, email: user.email, name: user.name, role: user.role, organization_id: user.organization_id } 
            });
        } catch (err) {
            await dbClient.query('ROLLBACK'); // In case of error (like constraint violation), rollback
            throw err;
        } finally {
            dbClient.release(); // Return client to connection pool
        }
    } catch (err) {
        next(err); // Push error to the central errorHandler middleware
    }
};

/**
 * Native Email/Password Login
 */
exports.login = async (req, res, next) => {
    try {
        const { email, password } = req.body;
        const result = await db.query('SELECT * FROM users WHERE email = $1 AND deleted_at IS NULL', [email]);
        if (result.rows.length === 0) {
            return res.status(401).json({ success: false, message: 'Invalid credentials.' });
        }
        const user = result.rows[0];
        const match = await bcrypt.compare(password, user.password_hash);
        if (!match) {
            return res.status(401).json({ success: false, message: 'Invalid credentials.' });
        }
        const accessToken = generateAccessToken(user);
        const refreshToken = generateRefreshToken(user);
        res.status(200).json({
            success: true,
            accessToken,
            refreshToken,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                organization_id: user.organization_id,
                must_change_password: user.must_change_password, // ← First-login flag
            },
        });
    } catch (err) {
        next(err);
    }
};

/**
 * Change Password — clears the must_change_password flag.
 * Called by a member on their very first login.
 */
exports.changePassword = async (req, res, next) => {
    try {
        const { newPassword } = req.body;
        if (!newPassword || newPassword.length < 6) {
            return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
        }
        const passwordHash = await bcrypt.hash(newPassword, 10);
        const result = await db.query(
            `UPDATE users SET password_hash = $1, must_change_password = FALSE, updated_at = CURRENT_TIMESTAMP
             WHERE id = $2 RETURNING id, email, name, role, organization_id, must_change_password`,
            [passwordHash, req.user.id]
        );
        const user = result.rows[0];
        // Issue fresh tokens so AuthContext stays in sync with the updated flag
        const accessToken = generateAccessToken(user);
        const refreshToken = generateRefreshToken(user);
        res.status(200).json({ success: true, accessToken, refreshToken, user });
    } catch (err) {
        next(err);
    }
};

/**
 * Google OAuth Flow.
 * Creates an account transparently if they don't exist.
 */
exports.googleLogin = async (req, res, next) => {
    try {
        const { tokenId } = req.body; // Sent by frontend React Google Login component

        // Verifying prevents spoofing email addresses
        const ticket = await client.verifyIdToken({
            idToken: tokenId,
            audience: process.env.GOOGLE_CLIENT_ID || 'dummy-client-id',
        });
        
        const payload = ticket.getPayload();
        const email = payload.email;
        const name = payload.name;
        const googleId = payload.sub;

        const result = await db.query('SELECT * FROM users WHERE email = $1 AND deleted_at IS NULL', [email]);
        let user;

        if (result.rows.length === 0) {
            // New user via Google Auth. By default, give them a personal workspace as ADMIN so they can use the app immediately!
            const dbClient = await db.pool.connect();
            try {
                await dbClient.query('BEGIN');
                
                const orgResult = await dbClient.query(
                    `INSERT INTO organizations (name) VALUES ($1) RETURNING id`,
                    [`${name}'s Workspace`]
                );
                const orgId = orgResult.rows[0].id;
                
                const userResult = await dbClient.query(
                    `INSERT INTO users (organization_id, name, email, google_id, role) 
                     VALUES ($1, $2, $3, $4, 'ADMIN') RETURNING *`,
                    [orgId, name, email, googleId] 
                );
                
                await dbClient.query('COMMIT');
                user = userResult.rows[0];
            } catch (err) {
                await dbClient.query('ROLLBACK');
                throw err;
            } finally {
                dbClient.release();
            }
        } else {
            user = result.rows[0];
        }

        const accessToken = generateAccessToken(user);
        const refreshToken = generateRefreshToken(user);

        res.status(200).json({ success: true, accessToken, refreshToken, user: { id: user.id, email: user.email, name: user.name, role: user.role, organization_id: user.organization_id } });
    } catch (err) {
        next(err);
    }
};

/**
 * Exchange valid Refresh Token for a fresh Access Token.
 */
exports.refreshToken = async (req, res, next) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) return res.status(401).json({ success: false, message: 'Refresh token required.' });

        try {
            const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || 'super_secret_refresh_key123');
            const result = await db.query('SELECT * FROM users WHERE id = $1 AND deleted_at IS NULL', [decoded.id]);
            
            if (result.rows.length === 0) throw new Error('User missing');
            
            const user = result.rows[0];
            const newAccessToken = generateAccessToken(user);
            
            res.json({ success: true, accessToken: newAccessToken });
        } catch (err) {
            return res.status(403).json({ success: false, message: 'Invalid or expired refresh token. Please login again.' });
        }
    } catch (err) {
        next(err);
    }
};
