const db = require('../config/db');

/**
 * Gather holistic insights for the UI dashboard.
 */
exports.getStats = async (req, res, next) => {
    try {
        let queryParams = [req.tenantId];
        let roleFilter = '';
        
        if (req.user.role === 'MEMBER') {
            roleFilter = ` AND (assigned_to = $2 OR created_by = $2)`;
            queryParams.push(req.user.id);
        }

        // Optimize! A single fast aggregation query to grab the status distribution.
        const summaryResult = await db.query(`
            SELECT 
                COUNT(*) as total_tasks,
                COUNT(*) FILTER (WHERE status = 'COMPLETED') as completed_tasks,
                COUNT(*) FILTER (WHERE status = 'PENDING') as pending_tasks,
                COUNT(*) FILTER (WHERE status = 'OVERDUE') as overdue_tasks
            FROM tasks
            WHERE organization_id = $1 AND deleted_at IS NULL ${roleFilter}
        `, queryParams);

        // Fetch User specific performance distribution (Admin only feature)
        let userStats = [];
        if (req.user.role === 'ADMIN') {
            const userStatsResult = await db.query(`
                SELECT u.name, COUNT(t.id) as assigned_tasks 
                FROM users u
                LEFT JOIN tasks t ON u.id = t.assigned_to AND t.deleted_at IS NULL
                WHERE u.organization_id = $1 AND u.deleted_at IS NULL
                GROUP BY u.id, u.name
            `, [req.tenantId]);
            userStats = userStatsResult.rows;
        }

        res.status(200).json({ 
            success: true, 
            summary: summaryResult.rows[0],
            userStats
        });
    } catch (err) {
        next(err);
    }
};
