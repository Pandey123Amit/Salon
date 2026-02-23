const { processWebhookEvent } = require('../services/payment.service');
const logger = require('../utils/logger');

/**
 * POST /razorpay-webhook
 * Respond 200 immediately, process async (same pattern as Meta webhook).
 */
function handleRazorpayWebhook(req, res) {
  res.sendStatus(200);

  processWebhookEvent(req.body).catch((err) => {
    logger.error('Razorpay webhook processing error', {
      error: err.message,
      stack: err.stack,
    });
  });
}

module.exports = { handleRazorpayWebhook };
