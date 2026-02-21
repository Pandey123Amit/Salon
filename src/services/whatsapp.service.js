const { decryptToken } = require('./whatsapp-crypto.service');
const logger = require('../utils/logger');

const GRAPH_API_BASE = 'https://graph.facebook.com/v21.0';

// ─── Meta Payload Builders ───────────────────────────────────────

/**
 * Convert formatForWhatsApp() output into a Meta Cloud API message payload.
 * @param {string} to - Recipient phone with country code (e.g. 919876543210)
 * @param {Object} formatted - Output from formatForWhatsApp()
 * @returns {Object} Meta Graph API message payload
 */
function buildMetaPayload(to, formatted) {
  const base = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
  };

  if (formatted.type === 'text') {
    return {
      ...base,
      type: 'text',
      text: { body: formatted.body },
    };
  }

  if (formatted.type === 'button') {
    return {
      ...base,
      type: 'interactive',
      interactive: {
        type: 'button',
        body: { text: formatted.body },
        action: {
          buttons: formatted.buttons.map((btn) => ({
            type: 'reply',
            reply: { id: btn.id, title: btn.title },
          })),
        },
      },
    };
  }

  if (formatted.type === 'list') {
    return {
      ...base,
      type: 'interactive',
      interactive: {
        type: 'list',
        body: { text: formatted.body },
        action: {
          button: formatted.buttonText,
          sections: formatted.sections.map((section) => ({
            title: section.title,
            rows: section.rows.map((row) => ({
              id: row.id,
              title: row.title,
              description: row.description || '',
            })),
          })),
        },
      },
    };
  }

  // Fallback to text
  return {
    ...base,
    type: 'text',
    text: { body: formatted.body || '' },
  };
}

// ─── Graph API Communication ─────────────────────────────────────

/**
 * Send a message via the Meta Cloud API.
 * @param {string} phoneNumberId - Salon's WhatsApp phone number ID
 * @param {string} encryptedAccessToken - AES-256-GCM encrypted token from DB
 * @param {Object} payload - Meta message payload (from buildMetaPayload)
 * @returns {Object} API response with message wamid
 */
async function sendMessage(phoneNumberId, encryptedAccessToken, payload) {
  const accessToken = decryptToken(encryptedAccessToken);
  const url = `${GRAPH_API_BASE}/${phoneNumberId}/messages`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok) {
    logger.error('WhatsApp API error', {
      status: response.status,
      error: data.error,
      phoneNumberId,
    });
    throw new Error(data.error?.message || 'WhatsApp API request failed');
  }

  return data;
}

/**
 * Mark an inbound message as read (sends blue ticks).
 * @param {string} phoneNumberId
 * @param {string} encryptedAccessToken
 * @param {string} messageId - wamid of the message to mark as read
 */
async function markAsRead(phoneNumberId, encryptedAccessToken, messageId) {
  const accessToken = decryptToken(encryptedAccessToken);
  const url = `${GRAPH_API_BASE}/${phoneNumberId}/messages`;

  try {
    await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        status: 'read',
        message_id: messageId,
      }),
    });
  } catch (err) {
    logger.warn('Failed to send read receipt', { messageId, error: err.message });
  }
}

module.exports = { buildMetaPayload, sendMessage, markAsRead };
