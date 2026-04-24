const db = require('../config/db');

/**
 * Audit Activity Logger Service
 * 
 * Provides an encapsulated way to insert activity logs.
 * Supports taking an explicit DB Client in case we are logging inside a larger
 * atomic transaction (e.g., creating a task and logging its creation simultaneously in one BEGIN/COMMIT block).
 */
exports.logActivity = async (organizationId, taskId, action, userId, client = null) => {
    // Determine whether to use the provided transaction client or the standard pool
    const databaseSource = client || db;
    
    await databaseSource.query(
        `INSERT INTO activity_logs (organization_id, task_id, action, performed_by)
         VALUES ($1, $2, $3, $4)`,
        [organizationId, taskId, action, userId]
    );
};
