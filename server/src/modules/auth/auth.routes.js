const router = require('express').Router();
const { authLimiter } = require('../../middlewares/rateLimiter');
const { authenticateUser } = require('../../middlewares/auth');
const { validate } = require('../../utils/validate');
const controller = require('./auth.controller');
const {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} = require('./auth.validation');

router.post('/register', authLimiter, validate(registerSchema), controller.register);
router.post('/login', authLimiter, validate(loginSchema), controller.login);
router.post('/refresh', controller.refresh);
router.post('/logout', authenticateUser, controller.logout);
router.post('/forgot-password', authLimiter, validate(forgotPasswordSchema), controller.forgotPassword);
router.post('/reset-password', authLimiter, validate(resetPasswordSchema), controller.resetPassword);
router.get('/me', authenticateUser, controller.me);

module.exports = router;
