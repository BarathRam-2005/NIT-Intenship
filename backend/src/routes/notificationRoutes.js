const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const authenticateToken = require('../middleware/auth');

// No strict tenant requirement here, Notifications belong explicitly to the INDIVIDUAL User's scope!
router.use(authenticateToken);

router.get('/', notificationController.getNotifications);
router.put('/:id/read', notificationController.markRead);

module.exports = router;
