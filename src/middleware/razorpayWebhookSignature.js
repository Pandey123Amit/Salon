const { Payment, Salon } = require('../models');
const { verifyWebhookSignature } = require('../services/payment.service');
const { decryptToken } = require('../services/whatsapp-crypto.service');
const env = require('../config/env');
const logger = require('../utils/logger');

/**
 * Extract payment identifiers from a Razorpay webhook payload.
 * Tries payment_link.entity.id, then payment.entity.order_id, then payment.entity.id.
 */
function extractPaymentIdentifiers(body) {
  try {
    const payload = typeof body === 'string' ? JSON.parse(body) : body;
    const linkId = payload?.payload?.payment_link?.entity?.id;
    const orderId = payload?.payload?.payment?.entity?.order_id;
    const paymentId = payload?.payload?.payment?.entity?.id;
    return { linkId, orderId, paymentId };
  } catch {
    return {};
  }
}

/**
 * Look up the Payment record from webhook identifiers, return the salonId.
 */
async function findSalonIdFromPayment({ linkId, orderId, paymentId }) {
  let payment;
  if (linkId) {
    payment = await Payment.findOne({ razorpayPaymentLinkId: linkId }).select('salonId').lean();
  }
  if (!payment && orderId) {
    payment = await Payment.findOne({ razorpayOrderId: orderId }).select('salonId').lean();
  }
  if (!payment && paymentId) {
    payment = await Payment.findOne({ razorpayPaymentId: paymentId }).select('salonId').lean();
  }
  return payment?.salonId || null;
}

/**
 * Middleware to verify Razorpay X-Razorpay-Signature header.
 * Per-salon: looks up the salon's own webhook secret first, falls back to global.
 * Expects req.rawBody to be set by the raw-body-capturing JSON parser.
 */
async function verifyRazorpayWebhookSignature(req, res, next) {
  const signature = req.headers['x-razorpay-signature'];

  if (!signature) {
    logger.warn('Razorpay webhook missing X-Razorpay-Signature header');
    return res.status(401).json({ error: 'Missing signature' });
  }

  if (!req.rawBody) {
    logger.warn('Razorpay webhook missing raw body');
    return res.status(401).json({ error: 'Missing raw body' });
  }

  // Try per-salon secret first
  const identifiers = extractPaymentIdentifiers(req.rawBody);
  const salonId = await findSalonIdFromPayment(identifiers);

  if (salonId) {
    const salon = await Salon.findById(salonId)
      .select('+payment.razorpayWebhookSecret')
      .lean();

    if (salon?.payment?.razorpayWebhookSecret) {
      try {
        const salonSecret = decryptToken(salon.payment.razorpayWebhookSecret);
        if (verifyWebhookSignature(req.rawBody, signature, salonSecret)) {
          return next();
        }
      } catch (err) {
        logger.warn('Failed to decrypt salon webhook secret', { salonId, error: err.message });
      }
    }
  }

  // Fallback to global secret
  const globalSecret = env.razorpayWebhookSecret;
  if (globalSecret && verifyWebhookSignature(req.rawBody, signature, globalSecret)) {
    return next();
  }

  logger.warn('Razorpay webhook signature verification failed', {
    salonId: salonId || 'unknown',
  });
  return res.status(401).json({ error: 'Invalid signature' });
}

module.exports = verifyRazorpayWebhookSignature;
