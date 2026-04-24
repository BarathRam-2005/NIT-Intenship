const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const errorHandler = require('./middleware/errorHandler');

// Initialize the core Express application
const app = express();

// =====================================
// 1. GLOBAL MIDDLEWARE
// =====================================
// Enable Cross-Origin Resource Sharing. This allows our React frontend on a different port to make requests.
app.use(cors());

// Automatically parse incoming JSON payloads in request bodies
app.use(express.json());

// =====================================
// 2. API ROUTES
// =====================================
// A basic health check route to ensure the server is responding
app.get('/api/health', (req, res) => {
  res.status(200).json({ success: true, message: 'Server is running optimally.' });
});

// Plug in module routers
const authRoutes = require('./routes/authRoutes');
const inviteRoutes = require('./routes/inviteRoutes');
const taskRoutes = require('./routes/taskRoutes');
const logRoutes = require('./routes/logRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const notificationRoutes = require('./routes/notificationRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/invites', inviteRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/logs', logRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/notifications', notificationRoutes);

// Initialize Background Micro-services
const startCronJobs = require('./jobs/deadlineCron');
startCronJobs();

// =====================================
// 3. GLOBAL ERROR HANDLING
// =====================================
// Express evaluates middleware in order. By placing this at the very end, 
// any unhandled errors from the routes above will fall directly into this catch-all block.
app.use(errorHandler);

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`[Service] API successfully started on port ${PORT}`);
});
