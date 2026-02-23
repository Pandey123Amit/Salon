const request = require('supertest');
const app = require('../src/app');
const { Salon, Appointment } = require('../src/models');
const { buildSystemPrompt } = require('../src/services/llm.service');
const { connectDB, disconnectDB, clearDB } = require('./setup');
const {
  createSalonAndToken, createService, createStaff, createCustomer,
  createOffer, createFullSetup, getNextWeekday, authHeader,
} = require('./helpers');

// ─── Mock OpenAI ───────────────────────────────────────────────
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

// ─── Mock Razorpay SDK ─────────────────────────────────────────
const mockPaymentLinkCreate = jest.fn();

jest.mock('razorpay', () => {
  return jest.fn().mockImplementation(() => ({
    paymentLink: { create: mockPaymentLinkCreate },
    orders: { create: jest.fn() },
    payments: { refund: jest.fn() },
  }));
});

beforeAll(async () => { await connectDB(); });
afterAll(async () => { await disconnectDB(); });
afterEach(async () => {
  await clearDB();
  jest.clearAllMocks();
});

describe('Phase 6 — Chat + Payment Integration', () => {
  // ─── System Prompt ───────────────────────────────────────────
  describe('buildSystemPrompt — payment context', () => {
    it('should include PAYMENT section when payments enabled', async () => {
      const { salon } = await createSalonAndToken();
      const service = await createService(salon._id);

      // Enable payments
      await Salon.findByIdAndUpdate(salon._id, {
        'payment.isPaymentEnabled': true,
        'payment.paymentMode': 'required',
      });
      const updatedSalon = await Salon.findById(salon._id);

      const prompt = buildSystemPrompt({
        salon: updatedSalon,
        services: [service],
        offers: [],
      });

      expect(prompt).toContain('PAYMENT:');
      expect(prompt).toContain('REQUIRED');
      expect(prompt).toContain('Razorpay');
    });

    it('should not include PAYMENT section when payments disabled', async () => {
      const { salon } = await createSalonAndToken();
      const service = await createService(salon._id);

      const prompt = buildSystemPrompt({
        salon,
        services: [service],
        offers: [],
      });

      expect(prompt).not.toContain('PAYMENT:');
    });

    it('should include OPTIONAL label when mode is optional', async () => {
      const { salon } = await createSalonAndToken();
      const service = await createService(salon._id);

      await Salon.findByIdAndUpdate(salon._id, {
        'payment.isPaymentEnabled': true,
        'payment.paymentMode': 'optional',
      });
      const updatedSalon = await Salon.findById(salon._id);

      const prompt = buildSystemPrompt({
        salon: updatedSalon,
        services: [service],
        offers: [],
      });

      expect(prompt).toContain('OPTIONAL');
    });
  });

  // ─── Chat create_booking with payment ────────────────────────
  describe('create_booking — payment link flow', () => {
    async function setupPaymentSalon() {
      const { salon, token, service, staff, customer } = await createFullSetup();

      await Salon.findByIdAndUpdate(salon._id, {
        'payment.isPaymentEnabled': true,
        'payment.paymentMode': 'optional',
      });

      return { salon, token, service, staff, customer };
    }

    it('should include paymentLink when salon has payments enabled', async () => {
      const { token, service, staff } = await setupPaymentSalon();
      const nextDay = getNextWeekday();

      mockPaymentLinkCreate.mockResolvedValue({
        id: 'plink_chat_test',
        short_url: 'https://rzp.io/chat_test',
      });

      // Simulate create_booking tool call then final response
      mockCreateFn = jest.fn()
        .mockResolvedValueOnce({
          choices: [{
            message: {
              content: null,
              tool_calls: [{
                id: 'call_1',
                type: 'function',
                function: {
                  name: 'create_booking',
                  arguments: JSON.stringify({
                    serviceId: service._id.toString(),
                    date: nextDay,
                    startTime: '10:00',
                    staffId: staff._id.toString(),
                  }),
                },
              }],
            },
          }],
        })
        .mockResolvedValueOnce({
          choices: [{
            message: {
              content: 'Booking confirmed! Payment link: https://rzp.io/chat_test',
              tool_calls: [],
            },
          }],
        });

      const res = await request(app)
        .post('/api/chat/message')
        .set(authHeader(token))
        .send({ phone: '9123456789', message: 'Book haircut tomorrow at 10am' });

      expect(res.status).toBe(200);
      expect(res.body.data.paymentLink).toBe('https://rzp.io/chat_test');
    });

    it('should not include paymentLink when payments disabled', async () => {
      const { token, service, staff } = await createFullSetup();
      const nextDay = getNextWeekday();

      mockCreateFn = jest.fn()
        .mockResolvedValueOnce({
          choices: [{
            message: {
              content: null,
              tool_calls: [{
                id: 'call_1',
                type: 'function',
                function: {
                  name: 'create_booking',
                  arguments: JSON.stringify({
                    serviceId: service._id.toString(),
                    date: nextDay,
                    startTime: '10:00',
                    staffId: staff._id.toString(),
                  }),
                },
              }],
            },
          }],
        })
        .mockResolvedValueOnce({
          choices: [{
            message: {
              content: 'Booking confirmed!',
              tool_calls: [],
            },
          }],
        });

      const res = await request(app)
        .post('/api/chat/message')
        .set(authHeader(token))
        .send({ phone: '9123456789', message: 'Book haircut' });

      expect(res.status).toBe(200);
      expect(res.body.data.paymentLink).toBeNull();
    });

    it('should still succeed booking if payment link creation fails', async () => {
      const { token, service, staff } = await setupPaymentSalon();
      const nextDay = getNextWeekday();

      // Make payment link creation fail
      mockPaymentLinkCreate.mockRejectedValue(new Error('Razorpay API down'));

      mockCreateFn = jest.fn()
        .mockResolvedValueOnce({
          choices: [{
            message: {
              content: null,
              tool_calls: [{
                id: 'call_1',
                type: 'function',
                function: {
                  name: 'create_booking',
                  arguments: JSON.stringify({
                    serviceId: service._id.toString(),
                    date: nextDay,
                    startTime: '10:00',
                    staffId: staff._id.toString(),
                  }),
                },
              }],
            },
          }],
        })
        .mockResolvedValueOnce({
          choices: [{
            message: {
              content: 'Booking confirmed! (payment link unavailable)',
              tool_calls: [],
            },
          }],
        });

      const res = await request(app)
        .post('/api/chat/message')
        .set(authHeader(token))
        .send({ phone: '9123456789', message: 'Book haircut' });

      expect(res.status).toBe(200);
      // Booking should succeed, paymentLink null
      expect(res.body.data.paymentLink).toBeNull();

      // Verify appointment was still created
      const appointment = await Appointment.findOne({});
      expect(appointment).toBeTruthy();
      expect(appointment.status).toBe('confirmed');
    });
  });

  // ─── Reminder settings ───────────────────────────────────────
  describe('PUT /api/salon/reminder-settings', () => {
    it('should update reminder schedule', async () => {
      const { token } = await createSalonAndToken();

      const res = await request(app)
        .put('/api/salon/reminder-settings')
        .set(authHeader(token))
        .send({
          enabled: true,
          schedule: [
            { label: '1 day before', minutesBefore: 1440 },
            { label: '1 hour before', minutesBefore: 60 },
          ],
          noShowBufferMinutes: 45,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.salon.reminders.enabled).toBe(true);
      expect(res.body.data.salon.reminders.schedule).toHaveLength(2);
      expect(res.body.data.salon.noShowBufferMinutes).toBe(45);
    });

    it('should reject invalid noShowBufferMinutes', async () => {
      const { token } = await createSalonAndToken();

      const res = await request(app)
        .put('/api/salon/reminder-settings')
        .set(authHeader(token))
        .send({ noShowBufferMinutes: 999 });

      expect(res.status).toBe(400);
    });
  });
});
