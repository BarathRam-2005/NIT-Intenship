const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const authenticateToken = require('../middleware/auth');
const requireTenant = require('../middleware/tenant');

router.get('/stats', authenticateToken, requireTenant, dashboardController.getStats);

module.exports = router;
