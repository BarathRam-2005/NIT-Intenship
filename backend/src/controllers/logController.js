/**
 * Logs Controller
 */
const db = require('../config/db');

/**
 * Fetch logs matching the current tenant, filtered through RBAC view rules.
 */
exports.getLogs = async (req, res, next) => {
    try {
        const { limit = 50, offset = 0 } = req.query;
        let queryParams = [req.tenantId];
        
        let query = `
            SELECT al.id, al.action, al.timestamp, 
                   u.name as performed_by_name, t.title as task_title
            FROM activity_logs al
            LEFT JOIN users u ON al.performed_by = u.id
            LEFT JOIN tasks t ON al.task_id = t.id
            WHERE al.organization_id = $1
        `;

        let paramIndex = 2;
        
        // Members only legally see logs tied to tasks they relate to!
        if (req.user.role === 'MEMBER') {
            query += ` AND (t.assigned_to = $${paramIndex} OR t.created_by = $${paramIndex})`;
            queryParams.push(req.user.id);
            paramIndex++;
        }

        query += ` ORDER BY al.timestamp DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
        queryParams.push(limit, offset);

        const result = await db.query(query, queryParams);
        
        res.status(200).json({ success: true, count: result.rows.length, logs: result.rows });
    } catch (err) {
        next(err);
    }
};
