const crypto = require('crypto');

// env.setup.js runs via jest setupFiles — env vars are already set
const {
  encryptToken,
  decryptToken,
  verifyWebhookSignature,
} = require('../src/services/whatsapp-crypto.service');
const { buildMetaPayload } = require('../src/services/whatsapp.service');

describe('Phase 4 — Crypto Service (Unit)', () => {
  // ─── Encrypt / Decrypt ──────────────────────────────────────

  describe('encryptToken / decryptToken', () => {
    it('should roundtrip preserve original token', () => {
      const original = 'EAABsbCS1iHg-super-long-access-token-12345';
      const encrypted = encryptToken(original);
      const decrypted = decryptToken(encrypted);

      expect(decrypted).toBe(original);
    });

    it('should produce unique ciphertext on each call (random IV)', () => {
      const token = 'same-token-value';
      const a = encryptToken(token);
      const b = encryptToken(token);

      expect(a).not.toBe(b);
      // Both should still decrypt to the same value
      expect(decryptToken(a)).toBe(token);
      expect(decryptToken(b)).toBe(token);
    });

    it('should fail decryption when ciphertext is tampered', () => {
      const encrypted = encryptToken('my-secret-token');
      // Flip a character in the ciphertext portion (after second colon)
      const parts = encrypted.split(':');
      const tampered = parts[2][0] === 'a' ? 'b' + parts[2].slice(1) : 'a' + parts[2].slice(1);
      const bad = `${parts[0]}:${parts[1]}:${tampered}`;

      expect(() => decryptToken(bad)).toThrow();
    });

    it('should throw when WHATSAPP_ENCRYPTION_KEY is missing', () => {
      const original = process.env.WHATSAPP_ENCRYPTION_KEY;
      process.env.WHATSAPP_ENCRYPTION_KEY = '';

      // The env module caches the value, so we need to clear the require cache
      // Instead, we test the function behavior by temporarily clearing the env
      // The crypto service reads from env.whatsappEncryptionKey which reads from process.env at load time
      // So we re-require with cleared cache
      jest.resetModules();
      process.env.WHATSAPP_ENCRYPTION_KEY = '';
      const freshCrypto = require('../src/services/whatsapp-crypto.service');

      expect(() => freshCrypto.encryptToken('test')).toThrow('WHATSAPP_ENCRYPTION_KEY');

      // Restore
      process.env.WHATSAPP_ENCRYPTION_KEY = original;
      jest.resetModules();
    });
  });

  // ─── Webhook Signature Verification ─────────────────────────

  describe('verifyWebhookSignature', () => {
    const secret = process.env.WHATSAPP_APP_SECRET;

    function sign(body) {
      return 'sha256=' + crypto.createHmac('sha256', secret).update(body).digest('hex');
    }

    it('should verify a valid HMAC signature', () => {
      const body = Buffer.from('{"test":"data"}');
      const signature = sign(body);

      expect(verifyWebhookSignature(body, signature)).toBe(true);
    });

    it('should reject an invalid signature', () => {
      const body = Buffer.from('{"test":"data"}');
      const signature = 'sha256=0000000000000000000000000000000000000000000000000000000000000000';

      expect(verifyWebhookSignature(body, signature)).toBe(false);
    });

    it('should reject mismatched-length signature without crashing', () => {
      const body = Buffer.from('{"test":"data"}');
      const signature = 'sha256=tooshort';

      // timingSafeEqual requires same length — code should handle this gracefully
      expect(verifyWebhookSignature(body, signature)).toBe(false);
    });

    it('should reject empty signature', () => {
      const body = Buffer.from('{"test":"data"}');

      expect(verifyWebhookSignature(body, '')).toBe(false);
    });

    it('should reject missing signature (undefined)', () => {
      const body = Buffer.from('{"test":"data"}');

      expect(verifyWebhookSignature(body, undefined)).toBe(false);
    });
  });
});

describe('Phase 4 — Meta Payload Builder (Unit)', () => {
  const to = '919876543210';

  it('should build text message payload', () => {
    const formatted = { type: 'text', body: 'Hello, welcome!' };
    const payload = buildMetaPayload(to, formatted);

    expect(payload.messaging_product).toBe('whatsapp');
    expect(payload.to).toBe(to);
    expect(payload.type).toBe('text');
    expect(payload.text).toEqual({ body: 'Hello, welcome!' });
  });

  it('should build button (interactive) message payload', () => {
    const formatted = {
      type: 'button',
      body: 'Choose a service:',
      buttons: [
        { id: 'btn_1', title: 'Haircut' },
        { id: 'btn_2', title: 'Facial' },
      ],
    };
    const payload = buildMetaPayload(to, formatted);

    expect(payload.type).toBe('interactive');
    expect(payload.interactive.type).toBe('button');
    expect(payload.interactive.body.text).toBe('Choose a service:');
    expect(payload.interactive.action.buttons).toHaveLength(2);
    expect(payload.interactive.action.buttons[0]).toEqual({
      type: 'reply',
      reply: { id: 'btn_1', title: 'Haircut' },
    });
  });

  it('should build list (interactive) message payload', () => {
    const formatted = {
      type: 'list',
      body: 'Select a time slot:',
      buttonText: 'View Slots',
      sections: [
        {
          title: 'Morning',
          rows: [
            { id: 'slot_1', title: '09:00 AM', description: 'With Ravi' },
            { id: 'slot_2', title: '10:00 AM' },
          ],
        },
      ],
    };
    const payload = buildMetaPayload(to, formatted);

    expect(payload.type).toBe('interactive');
    expect(payload.interactive.type).toBe('list');
    expect(payload.interactive.body.text).toBe('Select a time slot:');
    expect(payload.interactive.action.button).toBe('View Slots');
    expect(payload.interactive.action.sections).toHaveLength(1);
    expect(payload.interactive.action.sections[0].rows[0].title).toBe('09:00 AM');
    // Missing description should default to empty string
    expect(payload.interactive.action.sections[0].rows[1].description).toBe('');
  });

  it('should fall back to text for unknown type', () => {
    const formatted = { type: 'carousel', body: 'Fallback text' };
    const payload = buildMetaPayload(to, formatted);

    expect(payload.type).toBe('text');
    expect(payload.text.body).toBe('Fallback text');
  });
});
