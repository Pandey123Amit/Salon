const crypto = require('crypto');
const env = require('../config/env');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

// ─── Webhook Signature Verification ──────────────────────────────

/**
 * Verify Meta's X-Hub-Signature-256 HMAC-SHA256 signature.
 * @param {Buffer} rawBody - Raw request body bytes
 * @param {string} signature - Value of X-Hub-Signature-256 header (sha256=...)
 * @returns {boolean}
 */
function verifyWebhookSignature(rawBody, signature) {
  if (!env.whatsappAppSecret || !signature) return false;

  const expected = 'sha256=' +
    crypto.createHmac('sha256', env.whatsappAppSecret).update(rawBody).digest('hex');

  const expectedBuf = Buffer.from(expected);
  const signatureBuf = Buffer.from(signature);

  if (expectedBuf.length !== signatureBuf.length) return false;

  return crypto.timingSafeEqual(expectedBuf, signatureBuf);
}

// ─── Access Token Encryption (AES-256-GCM) ──────────────────────

/**
 * Encrypt a plaintext access token for storage.
 * Format: iv:authTag:ciphertext (all hex-encoded)
 * @param {string} plaintext
 * @returns {string}
 */
function encryptToken(plaintext) {
  if (!env.whatsappEncryptionKey) {
    throw new Error('WHATSAPP_ENCRYPTION_KEY is required for token encryption');
  }

  const key = Buffer.from(env.whatsappEncryptionKey, 'hex');
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');

  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Decrypt a stored access token.
 * @param {string} encryptedToken - Format: iv:authTag:ciphertext
 * @returns {string}
 */
function decryptToken(encryptedToken) {
  if (!env.whatsappEncryptionKey) {
    throw new Error('WHATSAPP_ENCRYPTION_KEY is required for token decryption');
  }

  const [ivHex, authTagHex, ciphertext] = encryptedToken.split(':');
  const key = Buffer.from(env.whatsappEncryptionKey, 'hex');
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

module.exports = { verifyWebhookSignature, encryptToken, decryptToken };
