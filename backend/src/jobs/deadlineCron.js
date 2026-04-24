/**
 * Background Service - Deadline Detector
 * Scans Postgres continuously to detect past-due tasks and issues automated warnings.
 */
const cron = require('node-cron');
const db = require('../config/db');

function startCronJobs() {
    // Schedule string represents checking exactly at midnight every single day ('0 0 * * *').
    // Use '* * * * *' to test evaluating every single minute natively.
    cron.schedule('0 0 * * *', async () => {
        console.log('[Cron Service] Analyzing deadline thresholds...');
        const dbClient = await db.pool.connect();
        
        try {
            await dbClient.query('BEGIN');
            
            // 1. Shift completely expired Tasks to OVERDUE programmatically
            const updateResult = await dbClient.query(`
                UPDATE tasks 
                SET status = 'OVERDUE' 
                WHERE due_date < CURRENT_TIMESTAMP AND status != 'COMPLETED' AND status != 'OVERDUE' AND deleted_at IS NULL
                RETURNING id, title, assigned_to
            `);

            // 2. Alert users that their assignment escalated to overdue
            for (const task of updateResult.rows) {
                if (task.assigned_to) {
                    await dbClient.query(`
                        INSERT INTO notifications (user_id, message) 
                        VALUES ($1, $2)
                    `, [task.assigned_to, `CRITICAL: The task '${task.title}' is now Overdue.`]);
                }
            }

            // 3. Scan for tasks due within the immediate 24 hours. Send preemptive warnings.
            const approachingResult = await dbClient.query(`
                SELECT id, title, assigned_to 
                FROM tasks 
                WHERE due_date BETWEEN CURRENT_TIMESTAMP AND CURRENT_TIMESTAMP + INTERVAL '1 day'
                AND status != 'COMPLETED' AND deleted_at IS NULL
            `);

            for (const task of approachingResult.rows) {
                if (task.assigned_to) {
                    await dbClient.query(`
                        INSERT INTO notifications (user_id, message) 
                        VALUES ($1, $2)
                    `, [task.assigned_to, `WARNING: The task '${task.title}' is approaching its deadline (within 24 hours).`]);
                }
            }

            await dbClient.query('COMMIT');
            console.log(`[Cron Service] Sweep complete. Tagged ${updateResult.rows.length} newly overdue systems.`);
        } catch (error) {
            await dbClient.query('ROLLBACK');
            console.error('[Cron Service] Exception thrown:', error);
        } finally {
            dbClient.release(); // Hand resource back to connection pool
        }
    });
}

module.exports = startCronJobs;
