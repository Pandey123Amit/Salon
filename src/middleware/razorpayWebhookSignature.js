const { verifyWebhookSignature } = require('../services/payment.service');
const env = require('../config/env');
const logger = require('../utils/logger');

/**
 * Middleware to verify Razorpay X-Razorpay-Signature header.
 * Expects req.rawBody to be set by the raw-body-capturing JSON parser.
 */
function verifyRazorpayWebhookSignature(req, res, next) {
  const signature = req.headers['x-razorpay-signature'];

  if (!signature) {
    logger.warn('Razorpay webhook missing X-Razorpay-Signature header');
    return res.status(401).json({ error: 'Missing signature' });
  }

  if (!req.rawBody) {
    logger.warn('Razorpay webhook missing raw body');
    return res.status(401).json({ error: 'Missing raw body' });
  }

  const secret = env.razorpayWebhookSecret;
  if (!verifyWebhookSignature(req.rawBody, signature, secret)) {
    logger.warn('Razorpay webhook signature verification failed');
    return res.status(401).json({ error: 'Invalid signature' });
  }

  next();
}

module.exports = verifyRazorpayWebhookSignature;
