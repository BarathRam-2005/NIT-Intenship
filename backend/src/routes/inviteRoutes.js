const express = require('express');
const router = express.Router();
const inviteController = require('../controllers/inviteController');
const authenticateToken = require('../middleware/auth');
const requireTenant = require('../middleware/tenant');
const requireRole = require('../middleware/rbac');

// Open routes (Used by the person clicking the invite link)
router.get('/:token', inviteController.verifyInviteToken);
router.post('/accept', inviteController.acceptInvite);

// Protected routes (Admin ONLY payload generation)
router.post('/', authenticateToken, requireTenant, requireRole('ADMIN'), inviteController.inviteUser);

module.exports = router;
