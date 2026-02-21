const rateLimit = require('express-rate-limit');
const env = require('../config/env');

const generalLimiter = rateLimit({
  windowMs: env.rateLimitWindowMs,
  max: env.rateLimitMax,
  message: {
    success: false,
    message: 'Too many requests, please try again later',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: env.rateLimitWindowMs,
  max: env.authRateLimitMax,
  message: {
    success: false,
    message: 'Too many auth attempts, please try again later',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { generalLimiter, authLimiter };
