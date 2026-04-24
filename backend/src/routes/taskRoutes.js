const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');

// All task routes demand immediate Authentication and Tenant validation natively!
const authenticateToken = require('../middleware/auth');
const requireTenant = require('../middleware/tenant');
const requireRole = require('../middleware/rbac');

// Bind middlewares generically across all methods in this particular router.
router.use(authenticateToken);
router.use(requireTenant);

// Routing mapped properly utilizing RBAC dynamically inside the controller logic.
router.get('/members', taskController.getMembers); // Must be before /:id routes
router.post('/members', requireRole('ADMIN'), taskController.addMember);
router.put('/members/:id/status', requireRole('ADMIN'), taskController.updateMemberStatus);

router.get('/analytics', requireRole('ADMIN'), taskController.getDashboardAnalytics);
router.get('/activity-logs', requireRole('ADMIN'), taskController.getActivityLogs);

router.get('/', taskController.getTasks);
router.post('/', taskController.createTask);
router.put('/:id', taskController.updateTask);
router.delete('/:id', taskController.deleteTask);

module.exports = router;
