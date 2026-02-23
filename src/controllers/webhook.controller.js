const { Salon, MessageLog } = require('../models');
const { processMessage } = require('../services/chat.service');
const { buildMetaPayload, sendMessage, markAsRead } = require('../services/whatsapp.service');
const env = require('../config/env');
const logger = require('../utils/logger');

// ─── GET /webhook — Meta Verification Handshake ──────────────────

function verifyWebhook(req, res) {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === env.whatsappVerifyToken) {
    logger.info('Webhook verification successful');
    return res.status(200).send(challenge);
  }

  logger.warn('Webhook verification failed', { mode, token });
  return res.sendStatus(403);
}

// ─── POST /webhook — Incoming Messages & Status Updates ──────────

function handleWebhook(req, res) {
  // Respond 200 immediately to satisfy Meta's timeout
  res.sendStatus(200);

  // Process asynchronously
  processWebhookPayload(req.body).catch((err) => {
    logger.error('Webhook processing error', { error: err.message, stack: err.stack });
  });
}

/**
 * Async processor for incoming webhook payloads.
 * Handles both message events and status update events.
 */
async function processWebhookPayload(body) {
  if (body.object !== 'whatsapp_business_account') return;

  for (const entry of body.entry || []) {
    for (const change of entry.changes || []) {
      if (change.field !== 'messages') continue;

      const value = change.value;
      const phoneNumberId = value.metadata?.phone_number_id;

      if (!phoneNumberId) continue;

      // Handle status updates
      if (value.statuses) {
        await handleStatusUpdates(value.statuses);
        continue;
      }

      // Handle incoming messages
      if (value.messages) {
        await handleIncomingMessages(phoneNumberId, value.messages, value.contacts);
      }
    }
  }
}

// ─── Status Update Handler ───────────────────────────────────────

async function handleStatusUpdates(statuses) {
  for (const status of statuses) {
    const validStatuses = ['sent', 'delivered', 'read', 'failed'];
    if (!validStatuses.includes(status.status)) continue;

    const update = {
      status: status.status,
      statusTimestamp: status.timestamp
        ? new Date(parseInt(status.timestamp) * 1000)
        : new Date(),
    };

    if (status.status === 'failed' && status.errors?.length) {
      update.errorCode = status.errors[0].code;
      update.errorMessage = status.errors[0].title;
    }

    if (status.conversation?.id) {
      update.conversationId = status.conversation.id;
    }

    await MessageLog.findOneAndUpdate({ wamid: status.id }, { $set: update });
  }
}

// ─── Incoming Message Handler ────────────────────────────────────

async function handleIncomingMessages(phoneNumberId, messages, contacts) {
  // Look up salon by phoneNumberId (multi-tenant routing)
  const salon = await Salon.findOne({
    'whatsapp.phoneNumberId': phoneNumberId,
    'whatsapp.isConnected': true,
  }).select('+whatsapp.accessToken');

  if (!salon) {
    logger.warn('No salon found for phoneNumberId', { phoneNumberId });
    return;
  }

  for (const message of messages) {
    await handleSingleMessage(salon, phoneNumberId, message, contacts);
  }
}

async function handleSingleMessage(salon, phoneNumberId, message, contacts) {
  const wamid = message.id;

  // Dedup check — Meta delivers at-least-once
  const existing = await MessageLog.findOne({ wamid });
  if (existing) {
    logger.debug('Duplicate message skipped', { wamid });
    return;
  }

  // Extract text from various message types
  const text = extractMessageText(message);
  const senderPhone = message.from; // e.g. "919876543210"

  // Normalize phone — strip Indian country code (91) prefix
  const normalizedPhone = normalizePhone(senderPhone);

  // Log inbound message
  await MessageLog.create({
    salonId: salon._id,
    wamid,
    direction: 'inbound',
    customerPhone: normalizedPhone,
    messageType: message.type,
    content: text,
    status: 'delivered',
    statusTimestamp: message.timestamp
      ? new Date(parseInt(message.timestamp) * 1000)
      : new Date(),
  });

  // Send read receipt (blue ticks)
  await markAsRead(phoneNumberId, salon.whatsapp.accessToken, wamid);

  // Skip processing for unsupported types (image, audio, video, etc.)
  if (!text) {
    logger.info('Unsupported message type — logged but not processed', {
      type: message.type,
      wamid,
    });
    return;
  }

  // Process through chatbot
  const result = await processMessage(salon._id, normalizedPhone, text);

  // Build Meta payload from formatted WhatsApp response
  const formatted = result.reply.whatsapp;
  const metaPayload = buildMetaPayload(senderPhone, formatted);

  // Send reply via Graph API
  const apiResponse = await sendMessage(
    phoneNumberId,
    salon.whatsapp.accessToken,
    metaPayload
  );

  // Log outbound message
  const outboundWamid = apiResponse.messages?.[0]?.id;
  await MessageLog.create({
    salonId: salon._id,
    wamid: outboundWamid,
    direction: 'outbound',
    customerPhone: normalizedPhone,
    messageType: formatted.type,
    content: result.reply.text,
    status: 'sent',
    statusTimestamp: new Date(),
  });

  // Send payment link as CTA URL button if present
  if (result.paymentLink) {
    try {
      const paymentPayload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: senderPhone,
        type: 'interactive',
        interactive: {
          type: 'cta_url',
          body: {
            text: result.paymentRequired
              ? 'Payment karein apna appointment confirm karne ke liye:'
              : 'Online payment karna chahein toh yahan se karein:',
          },
          action: {
            name: 'cta_url',
            parameters: {
              display_text: 'Pay Now',
              url: result.paymentLink,
            },
          },
        },
      };

      const paymentApiResponse = await sendMessage(
        phoneNumberId,
        salon.whatsapp.accessToken,
        paymentPayload
      );

      const paymentWamid = paymentApiResponse.messages?.[0]?.id;
      await MessageLog.create({
        salonId: salon._id,
        wamid: paymentWamid,
        direction: 'outbound',
        customerPhone: normalizedPhone,
        messageType: 'interactive',
        content: `Payment link: ${result.paymentLink}`,
        status: 'sent',
        statusTimestamp: new Date(),
      });
    } catch (payErr) {
      logger.error('Failed to send payment link message', {
        error: payErr.message,
        salonId: salon._id,
      });
    }
  }
}

// ─── Helpers ─────────────────────────────────────────────────────

/**
 * Extract text content from various WhatsApp message types.
 * Returns null for unsupported types (image, audio, video, etc.).
 */
function extractMessageText(message) {
  switch (message.type) {
    case 'text':
      return message.text?.body || null;

    case 'interactive':
      // Button reply
      if (message.interactive?.type === 'button_reply') {
        return message.interactive.button_reply.title;
      }
      // List reply
      if (message.interactive?.type === 'list_reply') {
        return message.interactive.list_reply.title;
      }
      return null;

    case 'button':
      // Template button response
      return message.button?.text || null;

    default:
      return null;
  }
}

/**
 * Normalize phone number — strip Indian country code (91) prefix.
 * "919876543210" → "9876543210"
 */
function normalizePhone(phone) {
  if (phone && phone.length === 12 && phone.startsWith('91')) {
    return phone.slice(2);
  }
  return phone;
}

module.exports = { verifyWebhook, handleWebhook };
