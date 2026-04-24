/**
 * Invitation Controller
 * 
 * Secure flow for onboarding multiple users to the exact same organization.
 * Generates temporary cryptographically secure tokens.
 */
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const db = require('../config/db');
const { generateAccessToken, generateRefreshToken } = require('../utils/jwt');

/**
 * Admins ONLY: Generates an invitation token for a specific email
 */
exports.inviteUser = async (req, res, next) => {
    try {
        const { email } = req.body;
        const organizationId = req.tenantId; // Retrieved from `requireTenant` middleware safely
        const invitedBy = req.user.id;

        const existing = await db.query('SELECT id FROM users WHERE email = $1', [email]);
        if (existing.rows.length > 0) {
            return res.status(400).json({ success: false, message: 'User already exists in the system.' });
        }

        const token = crypto.randomBytes(32).toString('hex');
        
        // Token expires in exactly 48 hours for security
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 48);

        await db.query(
            `INSERT INTO invitations (organization_id, email, token, invited_by, expires_at)
             VALUES ($1, $2, $3, $4, $5)`,
            [organizationId, email, token, invitedBy, expiresAt]
        );

        // Normally, hook into an email server (SendGrid) here. For out-of-the-box demo, we return it to the frontend Admin.
        const inviteLink = `http://localhost:5173/register/invite?token=${token}`;

        res.status(201).json({ 
            success: true, 
            message: 'Invitation generated successfully.', 
            inviteLink 
        });
    } catch (err) {
        next(err);
    }
};

/**
 * Open Route: Gets organization info based on token.
 */
exports.verifyInviteToken = async (req, res, next) => {
    try {
        const { token } = req.params;
        
        const result = await db.query(`
            SELECT i.*, o.name as organization_name 
            FROM invitations i
            JOIN organizations o ON i.organization_id = o.id
            WHERE i.token = $1 AND i.is_accepted = FALSE AND i.expires_at > CURRENT_TIMESTAMP
        `, [token]);

        if (result.rows.length === 0) {
            return res.status(400).json({ success: false, message: 'Invalid or expired invitation token.' });
        }

        res.status(200).json({ success: true, invitation: result.rows[0] });
    } catch (err) {
        next(err);
    }
};

/**
 * Open Route: Accept the invite and register user as a MEMBER of the associated organization.
 */
exports.acceptInvite = async (req, res, next) => {
    try {
        const { token, name, password } = req.body;

        const dbClient = await db.pool.connect();
        try {
            await dbClient.query('BEGIN'); // Transaction required to use invite + create user atomically

            const result = await dbClient.query('SELECT * FROM invitations WHERE token = $1 AND is_accepted = FALSE AND expires_at > CURRENT_TIMESTAMP FOR UPDATE', [token]);
            if (result.rows.length === 0) {
                await dbClient.query('ROLLBACK');
                return res.status(400).json({ success: false, message: 'Invalid or expired invitation token.' });
            }

            const invite = result.rows[0];
            const passwordHash = await bcrypt.hash(password, 10);

            const userResult = await dbClient.query(
                `INSERT INTO users (organization_id, name, email, password_hash, role) 
                 VALUES ($1, $2, $3, $4, 'MEMBER') RETURNING *`,
                [invite.organization_id, name, invite.email, passwordHash]
            );

            // Invalidate token
            await dbClient.query('UPDATE invitations SET is_accepted = TRUE WHERE id = $1', [invite.id]);

            await dbClient.query('COMMIT');

            const user = userResult.rows[0];
            const accessToken = generateAccessToken(user);
            const refreshToken = generateRefreshToken(user);

            res.status(201).json({ success: true, accessToken, refreshToken, user: { id: user.id, email: user.email, name: user.name, role: user.role, organization_id: user.organization_id } });
        } catch (err) {
            await dbClient.query('ROLLBACK');
            throw err;
        } finally {
            dbClient.release();
        }
    } catch (err) {
        next(err);
    }
};
