const crypto = require('crypto');
const Razorpay = require('razorpay');
const { Payment, Appointment } = require('../models');
const { encryptToken, decryptToken } = require('./whatsapp-crypto.service');
const env = require('../config/env');
const logger = require('../utils/logger');

// ─── Razorpay Client Factory ────────────────────────────────────

/**
 * Build a Razorpay SDK instance using salon-level keys (preferred)
 * or falling back to platform-level env keys.
 */
function getRazorpayClient(salon) {
  let keyId = env.razorpayKeyId;
  let keySecret = env.razorpayKeySecret;

  if (salon?.payment?.razorpayKeyId && salon?.payment?.razorpayKeySecret) {
    keyId = salon.payment.razorpayKeyId;
    keySecret = decryptToken(salon.payment.razorpayKeySecret);
  }

  if (!keyId || !keySecret) {
    throw new Error('Razorpay credentials not configured');
  }

  return new Razorpay({ key_id: keyId, key_secret: keySecret });
}

// ─── Payment Link (WhatsApp flow) ───────────────────────────────

/**
 * Create a Razorpay Payment Link for an appointment.
 * Returns the short URL for sending via WhatsApp.
 */
async function createPaymentLink({ salon, appointment, customer }) {
  const razorpay = getRazorpayClient(salon);
  const amountPaise = Math.round(appointment.price * 100);

  const linkData = {
    amount: amountPaise,
    currency: 'INR',
    description: `Appointment #${appointment._id.toString().slice(-6)}`,
    customer: {
      contact: `+91${customer.phone}`,
      ...(customer.name ? { name: customer.name } : {}),
    },
    notify: { sms: false, email: false },
    callback_url: env.baseUrl ? `${env.baseUrl}/payment/success` : undefined,
    callback_method: env.baseUrl ? 'get' : undefined,
    notes: {
      appointmentId: appointment._id.toString(),
      salonId: salon._id.toString(),
      customerId: customer._id.toString(),
    },
  };

  const link = await razorpay.paymentLink.create(linkData);

  // Create Payment audit record
  const payment = await Payment.create({
    salonId: salon._id,
    appointmentId: appointment._id,
    customerId: customer._id,
    razorpayPaymentLinkId: link.id,
    amount: amountPaise,
    currency: 'INR',
    status: 'pending',
    paymentLinkUrl: link.short_url,
  });

  // Update appointment payment subdoc
  await Appointment.findByIdAndUpdate(appointment._id, {
    'payment.status': 'pending',
    'payment.razorpayPaymentLinkId': link.id,
    'payment.razorpayPaymentLinkUrl': link.short_url,
    'payment.amount': amountPaise,
  });

  return {
    paymentId: payment._id,
    paymentLinkId: link.id,
    paymentLinkUrl: link.short_url,
    amount: amountPaise,
  };
}

// ─── Order (Dashboard flow) ─────────────────────────────────────

/**
 * Create a Razorpay Order for dashboard checkout.
 */
async function createOrder({ salon, appointment, customer }) {
  const razorpay = getRazorpayClient(salon);
  const amountPaise = Math.round(appointment.price * 100);

  const order = await razorpay.orders.create({
    amount: amountPaise,
    currency: 'INR',
    notes: {
      appointmentId: appointment._id.toString(),
      salonId: salon._id.toString(),
      customerId: customer._id.toString(),
    },
  });

  const payment = await Payment.create({
    salonId: salon._id,
    appointmentId: appointment._id,
    customerId: customer._id,
    razorpayOrderId: order.id,
    amount: amountPaise,
    currency: 'INR',
    status: 'pending',
  });

  await Appointment.findByIdAndUpdate(appointment._id, {
    'payment.status': 'pending',
    'payment.razorpayOrderId': order.id,
    'payment.amount': amountPaise,
  });

  return {
    paymentId: payment._id,
    orderId: order.id,
    amount: amountPaise,
    currency: 'INR',
    keyId: salon?.payment?.razorpayKeyId || env.razorpayKeyId,
  };
}

// ─── Signature Verification ─────────────────────────────────────

/**
 * Verify Razorpay payment signature (dashboard checkout callback).
 * Uses HMAC-SHA256 of "orderId|paymentId".
 */
function verifyPaymentSignature({ orderId, paymentId, signature }, secret) {
  const body = `${orderId}|${paymentId}`;
  const expected = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex');

  const expectedBuf = Buffer.from(expected);
  const signatureBuf = Buffer.from(signature);

  if (expectedBuf.length !== signatureBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, signatureBuf);
}

/**
 * Verify Razorpay webhook signature.
 * Same timing-safe pattern as whatsapp-crypto.service.js.
 */
function verifyWebhookSignature(rawBody, signature, secret) {
  if (!secret || !signature) return false;

  const expected = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');

  const expectedBuf = Buffer.from(expected);
  const signatureBuf = Buffer.from(signature);

  if (expectedBuf.length !== signatureBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, signatureBuf);
}

// ─── Webhook Event Processing ───────────────────────────────────

/**
 * Process a Razorpay webhook event.
 * Handles: payment_link.paid, payment.captured, payment.failed, refund.processed
 */
async function processWebhookEvent(event) {
  const eventType = event.event;
  const payload = event.payload;

  logger.info('Processing Razorpay webhook', { eventType });

  switch (eventType) {
    case 'payment_link.paid': {
      const linkEntity = payload.payment_link?.entity;
      const paymentEntity = payload.payment?.entity;
      if (!linkEntity) break;

      const payment = await Payment.findOne({ razorpayPaymentLinkId: linkEntity.id });
      if (!payment) {
        logger.warn('Payment not found for link', { linkId: linkEntity.id });
        break;
      }

      payment.status = 'paid';
      payment.razorpayPaymentId = paymentEntity?.id;
      payment.method = paymentEntity?.method;
      payment.paidAt = new Date();
      payment.webhookEvents.push({ event: eventType, payload: event });
      await payment.save();

      await Appointment.findByIdAndUpdate(payment.appointmentId, {
        'payment.status': 'paid',
        'payment.razorpayPaymentId': paymentEntity?.id,
        'payment.paidAt': new Date(),
      });
      break;
    }

    case 'payment.captured': {
      const paymentEntity = payload.payment?.entity;
      if (!paymentEntity) break;

      const orderId = paymentEntity.order_id;
      const payment = orderId
        ? await Payment.findOne({ razorpayOrderId: orderId })
        : await Payment.findOne({ razorpayPaymentId: paymentEntity.id });

      if (!payment) {
        logger.warn('Payment not found for captured event', { orderId, paymentId: paymentEntity.id });
        break;
      }

      payment.status = 'paid';
      payment.razorpayPaymentId = paymentEntity.id;
      payment.method = paymentEntity.method;
      payment.paidAt = new Date();
      payment.webhookEvents.push({ event: eventType, payload: event });
      await payment.save();

      await Appointment.findByIdAndUpdate(payment.appointmentId, {
        'payment.status': 'paid',
        'payment.razorpayPaymentId': paymentEntity.id,
        'payment.paidAt': new Date(),
      });
      break;
    }

    case 'payment.failed': {
      const paymentEntity = payload.payment?.entity;
      if (!paymentEntity) break;

      const orderId = paymentEntity.order_id;
      const payment = orderId
        ? await Payment.findOne({ razorpayOrderId: orderId })
        : null;

      if (payment) {
        payment.status = 'failed';
        payment.webhookEvents.push({ event: eventType, payload: event });
        await payment.save();

        await Appointment.findByIdAndUpdate(payment.appointmentId, {
          'payment.status': 'failed',
        });
      }
      break;
    }

    case 'refund.processed': {
      const refundEntity = payload.refund?.entity;
      if (!refundEntity) break;

      const paymentId = refundEntity.payment_id;
      const payment = await Payment.findOne({ razorpayPaymentId: paymentId });

      if (payment) {
        // Determine if full or partial refund
        const refundAmount = refundEntity.amount;
        payment.status = refundAmount >= payment.amount ? 'refunded' : 'partially_refunded';
        payment.webhookEvents.push({ event: eventType, payload: event });
        await payment.save();

        await Appointment.findByIdAndUpdate(payment.appointmentId, {
          'payment.status': payment.status,
        });
      }
      break;
    }

    default:
      logger.debug('Unhandled Razorpay webhook event', { eventType });
  }
}

// ─── Refund ─────────────────────────────────────────────────────

/**
 * Initiate a refund via Razorpay.
 */
async function initiateRefund({ salon, paymentId, amount, reason }) {
  const payment = await Payment.findById(paymentId);
  if (!payment) throw new Error('Payment not found');
  if (payment.status !== 'paid') throw new Error('Payment is not in paid status');

  const razorpay = getRazorpayClient(salon);

  const refundData = {
    amount: amount || payment.amount,  // paise
    speed: 'normal',
    ...(reason ? { notes: { reason } } : {}),
  };

  const refund = await razorpay.payments.refund(payment.razorpayPaymentId, refundData);

  const newStatus = (amount && amount < payment.amount) ? 'partially_refunded' : 'refunded';

  payment.status = newStatus;
  payment.webhookEvents.push({
    event: 'refund.initiated',
    payload: { refundId: refund.id, amount: refundData.amount },
  });
  await payment.save();

  await Appointment.findByIdAndUpdate(payment.appointmentId, {
    'payment.status': newStatus,
  });

  return { refundId: refund.id, status: newStatus };
}

// ─── Lookup Helpers ─────────────────────────────────────────────

async function getPaymentByAppointment(appointmentId) {
  return Payment.findOne({ appointmentId }).sort({ createdAt: -1 });
}

module.exports = {
  getRazorpayClient,
  createPaymentLink,
  createOrder,
  verifyPaymentSignature,
  verifyWebhookSignature,
  processWebhookEvent,
  initiateRefund,
  getPaymentByAppointment,
};
