/**
 * Task Controller
 *
 * Implements strict Multi-Tenant filtering AND Role-Based Access controls (Admin vs Member limits)
 */
const db = require('../config/db');
const { logActivity } = require('../services/activityLogger');

/**
 * List all members in the same organization (Admin use: populate assign-to dropdowns)
 */
exports.getMembers = async (req, res, next) => {
    try {
        const result = await db.query(
            `SELECT id, name, email, role, deleted_at FROM users WHERE organization_id = $1 ORDER BY deleted_at ASC NULLS FIRST, name ASC`,
            [req.tenantId]
        );
        res.status(200).json({ success: true, members: result.rows });
    } catch (err) {
        next(err);
    }
};

/**
 * Admin adds a new member directly (no invite link).
 * Creates the user with a default password and flags them to change it on first login.
 */
exports.addMember = async (req, res, next) => {
    try {
        const { name, email } = req.body;
        if (!name || !email) {
            return res.status(400).json({ success: false, message: 'Name and email are required.' });
        }
        const existing = await db.query('SELECT id FROM users WHERE email = $1', [email]);
        if (existing.rows.length > 0) {
            return res.status(400).json({ success: false, message: 'This email is already registered.' });
        }
        const bcrypt = require('bcrypt');
        const DEFAULT_PASSWORD = 'Welcome@123';
        const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
        const result = await db.query(
            `INSERT INTO users (organization_id, name, email, password_hash, role, must_change_password)
             VALUES ($1, $2, $3, $4, 'MEMBER', TRUE) RETURNING id, name, email, role`,
            [req.tenantId, name, email, passwordHash]
        );
        res.status(201).json({ success: true, member: result.rows[0] });
    } catch (err) {
        next(err);
    }
};

/**
 * Validate RBAC restrictions. Members can only be assigned their own tasks by themselves? 
 * Actually, rules state: "Assign tasks within same organization. Only admins can assign"
 */
exports.createTask = async (req, res, next) => {
    try {
        const { title, description, priority, due_date, assigned_to } = req.body;
        
        // RBAC constraint: Only Admins can explicitly compose tasks.
        if (req.user.role !== 'ADMIN') {
            return res.status(403).json({ success: false, message: 'Only Admins can create tasks.' });
        }
        let finalAssignee = assigned_to;

        const dbClient = await db.pool.connect();
        try {
            await dbClient.query('BEGIN');
            
            const result = await dbClient.query(
                `INSERT INTO tasks (organization_id, title, description, priority, due_date, created_by, assigned_to)
                 VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
                [req.tenantId, title, description, priority, due_date, req.user.id, finalAssignee]
            );
            
            const task = result.rows[0];
            
            // Atomically Log the creation!
            await logActivity(req.tenantId, task.id, 'CREATED', req.user.id, dbClient);
            
            await dbClient.query('COMMIT');
            
            res.status(201).json({ success: true, task });
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

/**
 * Get tasks matching Tenant ID + RBAC Rules
 */
exports.getTasks = async (req, res, next) => {
    try {
        // Safe pagination to prevent database freezing
        const { status, priority, limit = 20, offset = 0 } = req.query;
        let query = `SELECT * FROM tasks WHERE organization_id = $1 AND deleted_at IS NULL`;
        let queryParams = [req.tenantId];
        let paramIndex = 2;

        // RBAC rules: Members ONLY see tasks assigned to them (or created by them)
        if (req.user.role === 'MEMBER') {
            query += ` AND (assigned_to = $${paramIndex} OR created_by = $${paramIndex})`;
            queryParams.push(req.user.id);
            paramIndex++;
        }

        if (status) {
            query += ` AND status = $${paramIndex++}`;
            queryParams.push(status);
        }
        
        if (priority) {
            query += ` AND priority = $${paramIndex++}`;
            queryParams.push(priority);
        }

        query += ` ORDER BY created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
        queryParams.push(limit, offset);

        const result = await db.query(query, queryParams);
        
        res.status(200).json({ success: true, count: result.rows.length, tasks: result.rows });
    } catch (err) {
        next(err);
    }
};

/**
 * Update task attributes safely
 */
exports.updateTask = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { title, description, status, priority, due_date, assigned_to, completion_approved, extension_requested, admin_remark } = req.body;

        const dbClient = await db.pool.connect();
        try {
            await dbClient.query('BEGIN');
            let taskResult;

            if (req.user.role === 'ADMIN') {
                const updateQuery = `
                    UPDATE tasks 
                    SET title=COALESCE($1, title), 
                        description = CASE WHEN $11::text IS NOT NULL THEN COALESCE($2, COALESCE(description, '')) || E'\n\n--- [Admin Rejected] ---\n' || $11::text ELSE COALESCE($2, description) END,
                        status=COALESCE($3, status), 
                        priority=COALESCE($4, priority), 
                        due_date=COALESCE($5, due_date), 
                        assigned_to=COALESCE($8, assigned_to), 
                        completion_approved=COALESCE($9, completion_approved), 
                        extension_requested=COALESCE($10, extension_requested),
                        updated_at=CURRENT_TIMESTAMP
                    WHERE id=$6 AND organization_id=$7 AND deleted_at IS NULL 
                    RETURNING *
                `;
                let safeParams = [title, description, status, priority, due_date, id, req.tenantId, assigned_to, completion_approved, extension_requested, admin_remark];
                taskResult = await dbClient.query(updateQuery, safeParams);
            } else {
                // MEMBERS can ONLY change status to COMPLETED or set extension_requested = true
                const memberUpdates = [];
                const params = [id, req.tenantId, req.user.id];
                let paramIndex = 4;

                if (status === 'COMPLETED') {
                    memberUpdates.push(`status = $${paramIndex++}`);
                    params.push('COMPLETED');
                }
                if (extension_requested === true) {
                    memberUpdates.push(`extension_requested = TRUE`);
                }

                if (memberUpdates.length === 0) {
                    await dbClient.query('ROLLBACK');
                    return res.status(400).json({ success: false, message: 'Members can only mark completed or request extensions.' });
                }

                const updateQuery = `
                    UPDATE tasks 
                    SET ${memberUpdates.join(', ')}, updated_at=CURRENT_TIMESTAMP
                    WHERE id=$1 AND organization_id=$2 AND assigned_to=$3 AND deleted_at IS NULL 
                    RETURNING *
                `;
                taskResult = await dbClient.query(updateQuery, params);
            }

            if (taskResult.rows.length === 0) {
                await dbClient.query('ROLLBACK');
                return res.status(404).json({ success: false, message: 'Task not found or access denied due to RBAC.' });
            }
            
            const task = taskResult.rows[0];

            await logActivity(req.tenantId, task.id, 'UPDATED', req.user.id, dbClient);

            await dbClient.query('COMMIT');
            res.status(200).json({ success: true, task });
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

/**
 * Perform a "Soft Delete"
 */
exports.deleteTask = async (req, res, next) => {
    try {
        if (req.user.role !== 'ADMIN') {
            return res.status(403).json({ success: false, message: 'Only Admins can delete tasks.' });
        }

        const { id } = req.params;
        let params = [id, req.tenantId];

        const dbClient = await db.pool.connect();
        try {
            await dbClient.query('BEGIN');

            const taskResult = await dbClient.query(
                `UPDATE tasks SET deleted_at = CURRENT_TIMESTAMP WHERE id=$1 AND organization_id=$2 AND deleted_at IS NULL RETURNING *`,
                params
            );

            if (taskResult.rows.length === 0) {
                await dbClient.query('ROLLBACK');
                return res.status(404).json({ success: false, message: 'Task not found or RBAC denied.' });
            }

            await logActivity(req.tenantId, id, 'DELETED', req.user.id, dbClient);

            await dbClient.query('COMMIT');
            res.status(200).json({ success: true, message: 'Task gracefully archived.' });
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

/**
 * Phase 2 APIs: Analytics, Audit Logs, and Member Management
 */
exports.getActivityLogs = async (req, res, next) => {
    try {
        const query = `
            SELECT a.id, a.action, a.timestamp, u.name as actor_name, t.title as task_title
            FROM activity_logs a
            LEFT JOIN users u ON a.performed_by = u.id
            LEFT JOIN tasks t ON a.task_id = t.id
            WHERE a.organization_id = $1
            ORDER BY a.timestamp DESC 
            LIMIT 100
        `;
        const result = await db.query(query, [req.tenantId]);
        res.status(200).json({ success: true, logs: result.rows });
    } catch (err) { next(err); }
};

exports.updateMemberStatus = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { suspend } = req.body;
        const query = `
            UPDATE users SET deleted_at = CASE WHEN $3::boolean THEN CURRENT_TIMESTAMP ELSE NULL END
            WHERE id = $1 AND organization_id = $2 AND role != 'ADMIN'
            RETURNING id, name, deleted_at
        `;
        const result = await db.query(query, [id, req.tenantId, suspend]);
        if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Member not found or cannot suspend admin.' });
        res.status(200).json({ success: true, message: suspend ? 'Member suspended' : 'Member reactivated', user: result.rows[0] });
    } catch (err) { next(err); }
};

exports.getDashboardAnalytics = async (req, res, next) => {
    try {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        
        const timelineQuery = `
            SELECT DATE(updated_at) as date, COUNT(*) as completed_count
            FROM tasks 
            WHERE organization_id = $1 AND status = 'COMPLETED' AND updated_at >= $2
            GROUP BY DATE(updated_at)
            ORDER BY date ASC
        `;
        const timeline = await db.query(timelineQuery, [req.tenantId, thirtyDaysAgo]);

        const performersQuery = `
            SELECT u.name, COUNT(t.id) as task_count
            FROM tasks t
            JOIN users u ON t.assigned_to = u.id
            WHERE t.organization_id = $1 AND t.status = 'COMPLETED'
            GROUP BY u.name
            ORDER BY task_count DESC
            LIMIT 5
        `;
        const topPerformers = await db.query(performersQuery, [req.tenantId]);

        const statsQuery = `
            SELECT status, COUNT(*) as count 
            FROM tasks 
            WHERE organization_id = $1 AND deleted_at IS NULL
            GROUP BY status
        `;
        const stats = await db.query(statsQuery, [req.tenantId]);

        res.status(200).json({ 
            success: true, 
            timeline: timeline.rows, 
            topPerformers: topPerformers.rows, 
            statusDistribution: stats.rows 
        });
    } catch (err) { next(err); }
};
