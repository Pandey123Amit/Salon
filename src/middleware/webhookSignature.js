const { verifyWebhookSignature } = require('../services/whatsapp-crypto.service');
const logger = require('../utils/logger');

/**
 * Middleware to verify Meta's X-Hub-Signature-256 header.
 * Expects req.rawBody to be set by the raw-body-capturing JSON parser.
 */
function verifyWebhookSignatureMiddleware(req, res, next) {
  const signature = req.headers['x-hub-signature-256'];

  if (!signature) {
    logger.warn('Webhook request missing X-Hub-Signature-256 header');
    return res.status(401).json({ error: 'Missing signature' });
  }

  if (!req.rawBody) {
    logger.warn('Webhook request missing raw body — parser misconfiguration');
    return res.status(401).json({ error: 'Missing raw body' });
  }

  if (!verifyWebhookSignature(req.rawBody, signature)) {
    logger.warn('Webhook signature verification failed');
    return res.status(401).json({ error: 'Invalid signature' });
  }

  next();
}

module.exports = verifyWebhookSignatureMiddleware;
