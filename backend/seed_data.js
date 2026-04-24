const db = require('./src/config/db');

const taskTitles = [
    'Update user authentication flow', 'Fix navigation bar bug', 'Design login page mockup',
    'Write unit tests for checkout', 'Optimize database queries', 'Migrate to React 19',
    'Add role-based access control', 'Resolve memory leak in server', 'Draft API documentation',
    'Integrate third-party payment gateway', 'Conduct security audit', 'Prepare quarterly report',
    'Implement dark mode toggle', 'Redesign email templates', 'Review PRs for frontend repo',
    'Update Node.js version', 'Set up CI/CD pipeline', 'Create onboarding tutorial',
    'Analyze competitor pricing', 'Fix mobile responsiveness on homepage'
];

const generatedTexts = ['Urgent fix needed.', 'Please follow the design spec closely.', 'Ensure backwards compatibility.', 'Client requested this by end of week.', 'Requires coordination with the backend team.'];

const getRandomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const getRandomItem = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randomDate = (start, end) => new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));

async function seed() {
    let client;
    try {
        client = await db.pool.connect();
        await client.query('BEGIN');

        console.log("Fetching existing Organization and Members...");
        const orgRes = await client.query('SELECT id FROM organizations LIMIT 1');
        if (orgRes.rows.length === 0) {
            console.error("No organization found. Please sign up in the UI first.");
            process.exit(1);
        }
        const orgId = orgRes.rows[0].id;

        const usersRes = await client.query('SELECT id, role FROM users WHERE organization_id = $1', [orgId]);
        if (usersRes.rows.length < 2) {
            console.error("Please add at least one member (other than the admin) under the organization via the UI before seeding.");
            process.exit(1);
        }
        
        const admins = usersRes.rows.filter(u => u.role === 'ADMIN').map(u => u.id);
        const members = usersRes.rows.map(u => u.id); // Anyone can be assigned
        const adminId = admins.length > 0 ? admins[0] : members[0];

        // Ensure columns exist (just in case)
        await client.query('ALTER TABLE tasks ADD COLUMN IF NOT EXISTS extension_requested BOOLEAN DEFAULT FALSE');
        await client.query('ALTER TABLE tasks ADD COLUMN IF NOT EXISTS completion_approved BOOLEAN DEFAULT FALSE');

        console.log(`Found Org ID: ${orgId}. Found ${members.length} users. Admins: ${admins.length}. Generating 80 tasks...`);

        let tasksInserted = 0;
        let logsInserted = 0;

        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
        const fifteenDaysAhead = new Date(now.getTime() + (15 * 24 * 60 * 60 * 1000));

        for (let i = 0; i < 80; i++) {
            const title = getRandomItem(taskTitles) + ` (Auto ${i})`;
            const description = getRandomItem(generatedTexts);
            const status = getRandomItem(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'OVERDUE']);
            const priority = getRandomItem(['LOW', 'MEDIUM', 'HIGH']);
            const assigned_to = getRandomItem(members);
            const created_by = adminId;
            
            // Randomize dates based on status
            const created_at = randomDate(thirtyDaysAgo, new Date());
            let due_date = new Date();
            
            if (status === 'COMPLETED') {
                due_date = randomDate(created_at, now); // Due in the past or recently
            } else if (status === 'OVERDUE') {
                due_date = randomDate(thirtyDaysAgo, new Date(now.getTime() - 86400000)); // Due date firmly in past
            } else {
                due_date = randomDate(now, fifteenDaysAhead); // Due in future
            }

            const completion_approved = (status === 'COMPLETED' && Math.random() > 0.4);
            const extension_requested = (status !== 'COMPLETED' && Math.random() > 0.8);

            const taskRes = await client.query(
                `INSERT INTO tasks (organization_id, title, description, status, priority, due_date, assigned_to, created_by, completion_approved, extension_requested, created_at, updated_at) 
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $11) RETURNING id`,
                [orgId, title, description, status, priority, due_date, assigned_to, created_by, completion_approved, extension_requested, created_at]
            );
            const taskId = taskRes.rows[0].id;
            tasksInserted++;

            // Create accompanying activity log for CREATED
            await client.query(
                `INSERT INTO activity_logs (organization_id, task_id, action, performed_by, timestamp)
                 VALUES ($1, $2, 'CREATED', $3, $4)`,
                [orgId, taskId, adminId, created_at]
            );
            logsInserted++;

            // If completed, add a COMPLETION log somewhat recently
            if (status === 'COMPLETED') {
                const completedAt = randomDate(created_at, now);
                await client.query(
                    `INSERT INTO activity_logs (organization_id, task_id, action, performed_by, timestamp)
                     VALUES ($1, $2, 'COMPLETED', $3, $4)`,
                    [orgId, taskId, assigned_to, completedAt]
                );
                logsInserted++;
                
                if (completion_approved) {
                    const approvedAt = randomDate(completedAt, now);
                     await client.query(
                        `INSERT INTO activity_logs (organization_id, task_id, action, performed_by, timestamp)
                         VALUES ($1, $2, 'APPROVED', $3, $4)`,
                        [orgId, taskId, adminId, approvedAt]
                    );
                    logsInserted++;
                }
            }
        }

        await client.query('COMMIT');
        console.log(`✅ Seeding Complete! Inserted ${tasksInserted} tasks and ${logsInserted} logs for realistic historical data.`);
    } catch (err) {
        if(client) await client.query('ROLLBACK');
        console.error("Seeding error:", err);
    } finally {
        if(client) client.release();
        await db.pool.end();
    }
}

seed();
