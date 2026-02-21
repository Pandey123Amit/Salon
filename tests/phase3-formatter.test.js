const { formatForWhatsApp } = require('../src/services/whatsapp-formatter.service');

describe('Phase 3 — WhatsApp Formatter (unit tests)', () => {
  // ─── Plain Text ──────────────────────────────────────────────

  describe('Plain text detection', () => {
    it('should format greeting as plain text', () => {
      const result = formatForWhatsApp('Namaste! Kaise madad kar sakta hoon?');
      expect(result.type).toBe('text');
      expect(result.body).toContain('Namaste');
    });

    it('should handle empty string', () => {
      const result = formatForWhatsApp('');
      expect(result.type).toBe('text');
      expect(result.body).toBe('');
    });

    it('should handle null input', () => {
      const result = formatForWhatsApp(null);
      expect(result.type).toBe('text');
    });
  });

  // ─── Confirmation Buttons ────────────────────────────────────

  describe('Confirmation question detection', () => {
    it('should detect "confirm karein" as confirmation', () => {
      const result = formatForWhatsApp('Haircut kal 3 PM pe confirm karein?');
      expect(result.type).toBe('button');
      expect(result.buttons).toHaveLength(2);
      expect(result.buttons[0].title).toBe('Haan, Book Karo');
      expect(result.buttons[1].title).toBe('Nahi, Cancel');
    });

    it('should detect "book karo" as confirmation', () => {
      const result = formatForWhatsApp('Shall I book karo for tomorrow?');
      expect(result.type).toBe('button');
    });

    it('should detect English "shall i book" as confirmation', () => {
      const result = formatForWhatsApp('Shall I book the appointment?');
      expect(result.type).toBe('button');
    });

    it('should detect "cancel" question as confirmation', () => {
      const result = formatForWhatsApp('Kya aap cancel karna chahte hain?');
      expect(result.type).toBe('button');
    });
  });

  // ─── Numbered Items → Buttons (2-3 items) ───────────────────

  describe('Numbered buttons (2-3 items)', () => {
    it('should format 2 items as buttons', () => {
      const text = 'Choose:\n1. Haircut\n2. Facial';
      const result = formatForWhatsApp(text);
      expect(result.type).toBe('button');
      expect(result.buttons).toHaveLength(2);
      expect(result.buttons[0].title).toBe('Haircut');
      expect(result.buttons[1].title).toBe('Facial');
    });

    it('should format 3 items as buttons', () => {
      const text = 'Options:\n1. Haircut — ₹200\n2. Facial — ₹500\n3. Shave — ₹100';
      const result = formatForWhatsApp(text);
      expect(result.type).toBe('button');
      expect(result.buttons).toHaveLength(3);
    });

    it('should use first part as title and rest as description', () => {
      const text = '1. Haircut — ₹200, 30 min\n2. Facial — ₹500, 60 min';
      const result = formatForWhatsApp(text);
      expect(result.buttons[0].title).toBe('Haircut');
    });
  });

  // ─── Numbered Items → List (4+ items) ───────────────────────

  describe('Numbered list (4+ items)', () => {
    it('should format 4+ items as a WhatsApp list', () => {
      const text = 'Available slots:\n1. 10:00 AM\n2. 10:30 AM\n3. 11:00 AM\n4. 11:30 AM';
      const result = formatForWhatsApp(text);
      expect(result.type).toBe('list');
      expect(result.buttonText).toBe('Options Dekhein');
      expect(result.sections).toHaveLength(1);
      expect(result.sections[0].rows).toHaveLength(4);
    });

    it('should handle 5+ items as list', () => {
      const text = 'Services:\n1. A\n2. B\n3. C\n4. D\n5. E\n6. F';
      const result = formatForWhatsApp(text);
      expect(result.type).toBe('list');
      expect(result.sections[0].rows).toHaveLength(6);
    });

    it('should extract header from non-numbered line', () => {
      const text = 'Yeh services hain:\n1. Haircut\n2. Facial\n3. Shave\n4. Massage';
      const result = formatForWhatsApp(text);
      expect(result.type).toBe('list');
      expect(result.body).toBe('Yeh services hain:');
    });
  });
});
