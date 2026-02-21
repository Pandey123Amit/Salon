const router = require('express').Router();
const { register, login, verifyOtp, getMe } = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { registerRules, loginRules, verifyOtpRules } = require('../validators/auth.validator');
const { authLimiter } = require('../middleware/rateLimiter');

router.post('/register', authLimiter, validate(registerRules), register);
router.post('/login', authLimiter, validate(loginRules), login);
router.post('/verify-otp', authLimiter, validate(verifyOtpRules), verifyOtp);
router.get('/me', protect, getMe);

module.exports = router;
