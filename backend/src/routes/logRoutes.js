const express = require('express');
const router = express.Router();
const logController = require('../controllers/logController');
const authenticateToken = require('../middleware/auth');
const requireTenant = require('../middleware/tenant');

// Retrieve all activity stream
router.get('/', authenticateToken, requireTenant, logController.getLogs);

module.exports = router;
