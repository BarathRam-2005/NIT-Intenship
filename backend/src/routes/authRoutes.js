const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Clean and explicit route mappings
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/google', authController.googleLogin);
router.post('/refresh', authController.refreshToken); // To get a new short-term access token
const authenticateToken = require('../middleware/auth');
router.post('/change-password', authenticateToken, authController.changePassword);

module.exports = router;
