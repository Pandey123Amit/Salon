const { buildSystemPrompt, toolDefinitions } = require('../src/services/llm.service');

describe('Phase 3 — LLM Service (unit tests)', () => {
  // ─── System Prompt ───────────────────────────────────────────

  describe('buildSystemPrompt()', () => {
    const mockContext = {
      salon: {
        name: 'Style Studio',
        phone: '9876543210',
        address: { street: '12 MG Road', city: 'Bangalore', state: 'Karnataka', pincode: '560001' },
        workingHours: [
          { day: 'monday', isOpen: true, openTime: '09:00', closeTime: '21:00' },
          { day: 'sunday', isOpen: false, openTime: '09:00', closeTime: '21:00' },
        ],
        slotDuration: 30,
      },
      services: [
        { name: 'Haircut', category: 'Hair', price: 200, duration: 30 },
        { name: 'Facial', category: 'Skin', price: 500, duration: 60 },
      ],
      offers: [
        { title: 'Summer Deal', discountType: 'percentage', discountValue: 20, description: 'All services' },
      ],
    };

    it('should include salon name', () => {
      const prompt = buildSystemPrompt(mockContext);
      expect(prompt).toContain('Style Studio');
    });

    it('should include salon address', () => {
      const prompt = buildSystemPrompt(mockContext);
      expect(prompt).toContain('12 MG Road');
      expect(prompt).toContain('Bangalore');
    });

    it('should include working hours', () => {
      const prompt = buildSystemPrompt(mockContext);
      expect(prompt).toContain('monday: 09:00 - 21:00');
    });

    it('should include closed days', () => {
      const prompt = buildSystemPrompt(mockContext);
      expect(prompt).toContain('sunday');
    });

    it('should include services with prices', () => {
      const prompt = buildSystemPrompt(mockContext);
      expect(prompt).toContain('Haircut');
      expect(prompt).toContain('₹200');
      expect(prompt).toContain('Facial');
      expect(prompt).toContain('₹500');
    });

    it('should include offers', () => {
      const prompt = buildSystemPrompt(mockContext);
      expect(prompt).toContain('Summer Deal');
      expect(prompt).toContain('20% off');
    });

    it('should include Hinglish instruction', () => {
      const prompt = buildSystemPrompt(mockContext);
      expect(prompt).toContain('Hinglish');
    });

    it('should include rules about not fabricating info', () => {
      const prompt = buildSystemPrompt(mockContext);
      expect(prompt).toContain('Never make up services');
    });

    it('should handle empty offers', () => {
      const prompt = buildSystemPrompt({ ...mockContext, offers: [] });
      expect(prompt).toContain('Koi special offer abhi nahi hai');
    });

    it('should handle missing address', () => {
      const ctx = { ...mockContext, salon: { ...mockContext.salon, address: null } };
      const prompt = buildSystemPrompt(ctx);
      expect(prompt).toContain('Address not set');
    });
  });

  // ─── Tool Definitions ───────────────────────────────────────

  describe('toolDefinitions', () => {
    it('should define exactly 8 tools', () => {
      expect(toolDefinitions).toHaveLength(8);
    });

    const expectedTools = [
      'get_services',
      'get_available_slots',
      'create_booking',
      'cancel_appointment',
      'get_customer_appointments',
      'get_salon_info',
      'get_offers',
      'handoff_to_human',
    ];

    it.each(expectedTools)('should include tool: %s', (toolName) => {
      const tool = toolDefinitions.find((t) => t.function.name === toolName);
      expect(tool).toBeDefined();
      expect(tool.type).toBe('function');
      expect(tool.function.description).toBeTruthy();
      expect(tool.function.parameters).toBeDefined();
    });

    it('get_available_slots should require serviceId and date', () => {
      const tool = toolDefinitions.find((t) => t.function.name === 'get_available_slots');
      expect(tool.function.parameters.required).toContain('serviceId');
      expect(tool.function.parameters.required).toContain('date');
    });

    it('create_booking should require serviceId, date, startTime', () => {
      const tool = toolDefinitions.find((t) => t.function.name === 'create_booking');
      expect(tool.function.parameters.required).toContain('serviceId');
      expect(tool.function.parameters.required).toContain('date');
      expect(tool.function.parameters.required).toContain('startTime');
    });

    it('handoff_to_human should require reason', () => {
      const tool = toolDefinitions.find((t) => t.function.name === 'handoff_to_human');
      expect(tool.function.parameters.required).toContain('reason');
    });
  });
});
