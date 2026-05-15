const express = require('express');
const { verifyToken, validateBody } = require('../middleware');
const authController = require('../controllers/authController');

const router = express.Router();

const registerSchema = {
  first_name: { required: true, type: 'string', minLength: 1, maxLength: 50 },
  last_name: { required: true, type: 'string', minLength: 1, maxLength: 50 },
  email: { required: true, type: 'string', pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
  password: { required: true, type: 'string', minLength: 6, maxLength: 128 },
  phone: { type: 'string', pattern: /^[+]?[0-9\s\-\(\)]{7,20}$/ },
  role: { type: 'string', maxLength: 50 },
};

const loginSchema = {
  email: { required: true, type: 'string' },
  password: { required: true, type: 'string' },
};

const forgotPasswordSchema = {
  email: { required: true, type: 'string' },
};

const resetPasswordSchema = {
  password: { required: true, type: 'string', minLength: 6 },
  confirmPassword: { required: true, type: 'string', minLength: 6 },
};

const changePasswordSchema = {
  currentPassword: { required: true, type: 'string' },
  newPassword: { required: true, type: 'string', minLength: 6 },
};

router.get('/me', verifyToken, authController.getMe);
router.post('/register', validateBody(registerSchema), authController.register);
router.post('/login', validateBody(loginSchema), authController.login);
router.post('/forgot-password', validateBody(forgotPasswordSchema), authController.forgotPassword);
router.post('/reset-password/:token', validateBody(resetPasswordSchema), authController.resetPassword);
router.post('/change-password', verifyToken, validateBody(changePasswordSchema), authController.changePassword);
router.post('/refresh', authController.refresh);
router.post('/logout', authController.logout);

module.exports = router;
