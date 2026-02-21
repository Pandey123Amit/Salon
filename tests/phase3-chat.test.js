const request = require('supertest');
const app = require('../src/app');
const { Conversation, Customer } = require('../src/models');
const { connectDB, disconnectDB, clearDB } = require('./setup');
const {
  createSalonAndToken, createSecondSalon, createService, createStaff,
  createCustomer, createOffer, createFullSetup, getNextWeekday, authHeader,
} = require('./helpers');

// ─── Mock OpenAI ───────────────────────────────────────────────
// We mock the entire openai module to control LLM responses
let mockCreateFn;

jest.mock('openai', () => {
  return jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: (...args) => mockCreateFn(...args),
      },
    },
  }));
});

beforeAll(async () => { await connectDB(); });
afterAll(async () => { await disconnectDB(); });
afterEach(async () => { await clearDB(); });

describe('Phase 3 — Chat Endpoints & Service', () => {
  // ─── Validation ──────────────────────────────────────────────

  describe('POST /api/chat/message — validation', () => {
    it('should reject missing phone', async () => {
      const { token } = await createSalonAndToken();
      const res = await request(app)
        .post('/api/chat/message')
        .set(authHeader(token))
        .send({ message: 'hi' });

      expect(res.status).toBe(400);
    });

    it('should reject invalid phone format', async () => {
      const { token } = await createSalonAndToken();
      const res = await request(app)
        .post('/api/chat/message')
        .set(authHeader(token))
        .send({ phone: '12345', message: 'hi' });

      expect(res.status).toBe(400);
    });

    it('should reject missing message', async () => {
      const { token } = await createSalonAndToken();
      const res = await request(app)
        .post('/api/chat/message')
        .set(authHeader(token))
        .send({ phone: '9876543210' });

      expect(res.status).toBe(400);
    });

    it('should reject unauthenticated request', async () => {
      const res = await request(app)
        .post('/api/chat/message')
        .send({ phone: '9876543210', message: 'hi' });

      expect(res.status).toBe(401);
    });
  });

  // ─── Simple greeting (no tool calls) ─────────────────────────

  describe('POST /api/chat/message — greeting flow', () => {
    it('should process a greeting and return response', async () => {
      const { salon, token } = await createSalonAndToken();
      await createService(salon._id);

      // Mock: LLM returns a simple text greeting (no tool calls)
      mockCreateFn = jest.fn().mockResolvedValue({
        choices: [{
          message: {
            role: 'assistant',
            content: 'Namaste! 🙏 Welcome to Test Salon. Kaise madad kar sakta hoon?',
            tool_calls: null,
          },
        }],
      });

      const res = await request(app)
        .post('/api/chat/message')
        .set(authHeader(token))
        .send({ phone: '9123456789', message: 'hi' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.reply.text).toContain('Namaste');
      expect(res.body.data.reply.whatsapp).toBeDefined();
      expect(res.body.data.reply.whatsapp.type).toBe('text');
      expect(res.body.data.conversationId).toBeDefined();
      expect(res.body.data.customer).toBeDefined();
    });

    it('should auto-create a new customer for unknown phone', async () => {
      const { salon, token } = await createSalonAndToken();
      await createService(salon._id);

      mockCreateFn = jest.fn().mockResolvedValue({
        choices: [{
          message: { role: 'assistant', content: 'Hello!', tool_calls: null },
        }],
      });

      await request(app)
        .post('/api/chat/message')
        .set(authHeader(token))
        .send({ phone: '9999888877', message: 'hi' });

      // Verify customer was auto-created
      const customer = await Customer.findOne({ salonId: salon._id, phone: '9999888877' });
      expect(customer).toBeTruthy();
      expect(customer.name).toContain('8877'); // last 4 digits
    });
  });

  // ─── Tool call flow: get_services ─────────────────────────────

  describe('POST /api/chat/message — tool call flow', () => {
    it('should handle get_services tool call', async () => {
      const { salon, token } = await createSalonAndToken();
      await createService(salon._id, { name: 'Haircut', price: 200 });
      await createService(salon._id, { name: 'Facial', category: 'Skin', price: 500 });

      let callCount = 0;
      mockCreateFn = jest.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // First call: LLM requests get_services tool
          return {
            choices: [{
              message: {
                role: 'assistant',
                content: null,
                tool_calls: [{
                  id: 'call_1',
                  type: 'function',
                  function: { name: 'get_services', arguments: '{}' },
                }],
              },
            }],
          };
        }
        // Second call: LLM returns final text after seeing tool results
        return {
          choices: [{
            message: {
              role: 'assistant',
              content: 'Hamare services:\n1. Haircut — ₹200\n2. Facial — ₹500',
              tool_calls: null,
            },
          }],
        };
      });

      const res = await request(app)
        .post('/api/chat/message')
        .set(authHeader(token))
        .send({ phone: '9123456789', message: 'kya services hain?' });

      expect(res.status).toBe(200);
      expect(res.body.data.reply.text).toContain('Haircut');
      // Should have called OpenAI twice (tool call + final response)
      expect(mockCreateFn).toHaveBeenCalledTimes(2);
    });
  });

  // ─── Session management ──────────────────────────────────────

  describe('Session management', () => {
    it('should maintain conversation across multiple messages', async () => {
      const { salon, token } = await createSalonAndToken();
      await createService(salon._id);

      mockCreateFn = jest.fn().mockResolvedValue({
        choices: [{
          message: { role: 'assistant', content: 'Response', tool_calls: null },
        }],
      });

      // Send first message
      const res1 = await request(app)
        .post('/api/chat/message')
        .set(authHeader(token))
        .send({ phone: '9123456789', message: 'hi' });

      const convId1 = res1.body.data.conversationId;

      // Send second message — should reuse same conversation
      const res2 = await request(app)
        .post('/api/chat/message')
        .set(authHeader(token))
        .send({ phone: '9123456789', message: 'services dikhao' });

      expect(res2.body.data.conversationId).toBe(convId1);
    });

    it('should start new session after timeout', async () => {
      const { salon, token } = await createSalonAndToken();
      await createService(salon._id);

      mockCreateFn = jest.fn().mockResolvedValue({
        choices: [{
          message: { role: 'assistant', content: 'Response', tool_calls: null },
        }],
      });

      // Send first message
      const res1 = await request(app)
        .post('/api/chat/message')
        .set(authHeader(token))
        .send({ phone: '9123456789', message: 'hi' });

      const convId1 = res1.body.data.conversationId;

      // Simulate session timeout by manually updating lastActivityAt
      await Conversation.findByIdAndUpdate(convId1, {
        lastActivityAt: new Date(Date.now() - 31 * 60 * 1000), // 31 min ago
      });

      // Send another message — should get new conversation
      const res2 = await request(app)
        .post('/api/chat/message')
        .set(authHeader(token))
        .send({ phone: '9123456789', message: 'hi again' });

      expect(res2.body.data.conversationId).not.toBe(convId1);
    });
  });

  // ─── Conversation History ────────────────────────────────────

  describe('GET /api/chat/history', () => {
    it('should return conversation history for a phone', async () => {
      const { salon, token } = await createSalonAndToken();
      await createService(salon._id);

      mockCreateFn = jest.fn().mockResolvedValue({
        choices: [{
          message: { role: 'assistant', content: 'Hello!', tool_calls: null },
        }],
      });

      // Create a conversation
      await request(app)
        .post('/api/chat/message')
        .set(authHeader(token))
        .send({ phone: '9123456789', message: 'hi' });

      const res = await request(app)
        .get('/api/chat/history?phone=9123456789')
        .set(authHeader(token));

      expect(res.status).toBe(200);
      expect(res.body.data.conversations).toHaveLength(1);
      expect(res.body.data.conversations[0].phone).toBe('9123456789');
      expect(res.body.data.conversations[0].messages.length).toBeGreaterThan(0);
    });

    it('should reject invalid phone in history query', async () => {
      const { token } = await createSalonAndToken();
      const res = await request(app)
        .get('/api/chat/history?phone=123')
        .set(authHeader(token));

      expect(res.status).toBe(400);
    });

    it('should return empty for unknown phone', async () => {
      const { token } = await createSalonAndToken();
      const res = await request(app)
        .get('/api/chat/history?phone=9999999999')
        .set(authHeader(token));

      expect(res.status).toBe(200);
      expect(res.body.data.conversations).toHaveLength(0);
    });
  });

  // ─── Cross-tenant Isolation ──────────────────────────────────

  describe('Tenant isolation', () => {
    it('should not show other salon conversations', async () => {
      const { salon: salon1, token: token1 } = await createSalonAndToken();
      const { token: token2 } = await createSecondSalon();
      await createService(salon1._id);

      mockCreateFn = jest.fn().mockResolvedValue({
        choices: [{
          message: { role: 'assistant', content: 'Hi!', tool_calls: null },
        }],
      });

      // Create conversation for salon1
      await request(app)
        .post('/api/chat/message')
        .set(authHeader(token1))
        .send({ phone: '9123456789', message: 'hi' });

      // Salon2 should see no history for that phone
      const res = await request(app)
        .get('/api/chat/history?phone=9123456789')
        .set(authHeader(token2));

      expect(res.body.data.conversations).toHaveLength(0);
    });
  });

  // ─── Conversation Model ──────────────────────────────────────

  describe('Conversation model', () => {
    it('should store messages with correct roles', async () => {
      const { salon, token } = await createSalonAndToken();
      await createService(salon._id);

      mockCreateFn = jest.fn().mockResolvedValue({
        choices: [{
          message: { role: 'assistant', content: 'Hello!', tool_calls: null },
        }],
      });

      const res = await request(app)
        .post('/api/chat/message')
        .set(authHeader(token))
        .send({ phone: '9123456789', message: 'hi' });

      const conv = await Conversation.findById(res.body.data.conversationId);
      expect(conv.messages).toHaveLength(2); // user + assistant
      expect(conv.messages[0].role).toBe('user');
      expect(conv.messages[0].content).toBe('hi');
      expect(conv.messages[1].role).toBe('assistant');
      expect(conv.messages[1].content).toBe('Hello!');
    });

    it('should track metadata.totalTurns', async () => {
      const { salon, token } = await createSalonAndToken();
      await createService(salon._id);

      mockCreateFn = jest.fn().mockResolvedValue({
        choices: [{
          message: { role: 'assistant', content: 'Response', tool_calls: null },
        }],
      });

      await request(app)
        .post('/api/chat/message')
        .set(authHeader(token))
        .send({ phone: '9123456789', message: 'msg 1' });

      await request(app)
        .post('/api/chat/message')
        .set(authHeader(token))
        .send({ phone: '9123456789', message: 'msg 2' });

      const conv = await Conversation.findOne({ salonId: salon._id, phone: '9123456789' });
      expect(conv.metadata.totalTurns).toBe(2);
    });

    it('should default state to greeting', async () => {
      const { salon, token } = await createSalonAndToken();
      await createService(salon._id);

      mockCreateFn = jest.fn().mockResolvedValue({
        choices: [{
          message: { role: 'assistant', content: 'Hi!', tool_calls: null },
        }],
      });

      const res = await request(app)
        .post('/api/chat/message')
        .set(authHeader(token))
        .send({ phone: '9123456789', message: 'hi' });

      expect(res.body.data.state).toBe('greeting');
    });
  });

  // ─── Error handling ──────────────────────────────────────────

  describe('Error handling', () => {
    it('should handle OpenAI API failure gracefully', async () => {
      const { salon, token } = await createSalonAndToken();
      await createService(salon._id);

      mockCreateFn = jest.fn().mockRejectedValue(new Error('OpenAI API error'));

      const res = await request(app)
        .post('/api/chat/message')
        .set(authHeader(token))
        .send({ phone: '9123456789', message: 'hi' });

      // Should return 500 or graceful error
      expect(res.status).toBe(500);
    });
  });
});
