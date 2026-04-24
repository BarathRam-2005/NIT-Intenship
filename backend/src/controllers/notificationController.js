/**
 * Personal Notifications interface
 */
const db = require('../config/db');

exports.getNotifications = async (req, res, next) => {
    try {
        const result = await db.query(
            `SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50`,
            [req.user.id] // Ensure users only see exactly their specific alerts
        );
        res.status(200).json({ success: true, count: result.rows.length, notifications: result.rows });
    } catch (err) {
        next(err);
    }
};

exports.markRead = async (req, res, next) => {
    try {
        const { id } = req.params;
        const result = await db.query(
            `UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2 RETURNING *`,
            [id, req.user.id] // Validation ensuring they own it before marking
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Notification not found' });
        }
        res.status(200).json({ success: true, notification: result.rows[0] });
    } catch (err) {
        next(err);
    }
};
