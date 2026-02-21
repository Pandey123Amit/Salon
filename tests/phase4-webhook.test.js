const request = require('supertest');
const app = require('../src/app');
const { Salon, MessageLog } = require('../src/models');
const { encryptToken } = require('../src/services/whatsapp-crypto.service');
const { connectDB, disconnectDB, clearDB } = require('./setup');
const {
  createSalonAndToken,
  authHeader,
  buildWebhookPayload,
  signPayload,
} = require('./helpers');

// ─── Mocks ──────────────────────────────────────────────────────

// Mock sendMessage & markAsRead but keep buildMetaPayload real
jest.mock('../src/services/whatsapp.service', () => {
  const actual = jest.requireActual('../src/services/whatsapp.service');
  return {
    ...actual,
    sendMessage: jest.fn().mockResolvedValue({
      messages: [{ id: 'wamid.outbound-test-123' }],
    }),
    markAsRead: jest.fn().mockResolvedValue(undefined),
  };
});

// Mock OpenAI (processMessage calls it internally)
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

const { sendMessage, markAsRead } = require('../src/services/whatsapp.service');

const APP_SECRET = process.env.WHATSAPP_APP_SECRET;
const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN;
const PHONE_NUMBER_ID = '109876543210';

// Small delay to let async webhook processing complete
const waitForAsync = (ms = 300) => new Promise((r) => setTimeout(r, ms));

// ─── Setup ──────────────────────────────────────────────────────

beforeAll(async () => { await connectDB(); });
afterAll(async () => { await disconnectDB(); });
afterEach(async () => {
  await clearDB();
  jest.clearAllMocks();
});

/**
 * Create a salon with WhatsApp connected (encrypted access token in DB).
 */
async function createConnectedSalon() {
  const { salon, token } = await createSalonAndToken();
  const encryptedToken = encryptToken('test-access-token-for-meta-api');

  await Salon.findByIdAndUpdate(salon._id, {
    $set: {
      'whatsapp.phoneNumberId': PHONE_NUMBER_ID,
      'whatsapp.accessToken': encryptedToken,
      'whatsapp.isConnected': true,
      'whatsapp.connectedAt': new Date(),
    },
  });

  return { salon, token, encryptedToken };
}

// ─── Tests ──────────────────────────────────────────────────────

describe('Phase 4 — Webhook Endpoints', () => {
  // ─── GET /webhook — Verification Handshake ────────────────

  describe('GET /webhook — verification handshake', () => {
    it('should return challenge when verify token and mode are valid', async () => {
      const res = await request(app)
        .get('/webhook')
        .query({
          'hub.mode': 'subscribe',
          'hub.verify_token': VERIFY_TOKEN,
          'hub.challenge': 'challenge_abc_123',
        });

      expect(res.status).toBe(200);
      expect(res.text).toBe('challenge_abc_123');
    });

    it('should return 403 for wrong verify token', async () => {
      const res = await request(app)
        .get('/webhook')
        .query({
          'hub.mode': 'subscribe',
          'hub.verify_token': 'wrong-token',
          'hub.challenge': 'challenge_abc_123',
        });

      expect(res.status).toBe(403);
    });

    it('should return 403 when mode or token are missing', async () => {
      const res = await request(app)
        .get('/webhook')
        .query({ 'hub.challenge': 'challenge_abc_123' });

      expect(res.status).toBe(403);
    });
  });

  // ─── POST /webhook — Signature Verification ───────────────

  describe('POST /webhook — signature verification', () => {
    it('should return 401 when X-Hub-Signature-256 is missing', async () => {
      const body = { object: 'whatsapp_business_account', entry: [] };

      const res = await request(app)
        .post('/webhook')
        .send(body);

      expect(res.status).toBe(401);
    });

    it('should return 401 for invalid signature', async () => {
      const body = { object: 'whatsapp_business_account', entry: [] };

      const res = await request(app)
        .post('/webhook')
        .set('X-Hub-Signature-256', 'sha256=invalid')
        .send(body);

      expect(res.status).toBe(401);
    });

    it('should return 200 for valid signature', async () => {
      const body = { object: 'whatsapp_business_account', entry: [] };
      const bodyStr = JSON.stringify(body);
      const signature = signPayload(bodyStr, APP_SECRET);

      const res = await request(app)
        .post('/webhook')
        .set('Content-Type', 'application/json')
        .set('X-Hub-Signature-256', signature)
        .send(bodyStr);

      expect(res.status).toBe(200);
    });
  });

  // ─── POST /webhook — Message Processing ───────────────────

  describe('POST /webhook — message processing', () => {
    beforeEach(() => {
      // Default: LLM returns a simple text reply (no tool calls)
      mockCreateFn = jest.fn().mockResolvedValue({
        choices: [{
          message: {
            role: 'assistant',
            content: 'Namaste! Welcome to Test Salon.',
            tool_calls: null,
          },
          finish_reason: 'stop',
        }],
      });
    });

    async function postWebhook(body) {
      const bodyStr = JSON.stringify(body);
      const signature = signPayload(bodyStr, APP_SECRET);

      return request(app)
        .post('/webhook')
        .set('Content-Type', 'application/json')
        .set('X-Hub-Signature-256', signature)
        .send(bodyStr);
    }

    it('should log inbound text message and call processMessage', async () => {
      await createConnectedSalon();

      const message = {
        id: 'wamid.inbound-text-001',
        from: '919876543210',
        timestamp: '1700000000',
        type: 'text',
        text: { body: 'Hi, I want a haircut' },
      };
      const body = buildWebhookPayload(PHONE_NUMBER_ID, message);

      const res = await postWebhook(body);
      expect(res.status).toBe(200);

      await waitForAsync();

      // Inbound message should be logged
      const inbound = await MessageLog.findOne({ wamid: 'wamid.inbound-text-001' });
      expect(inbound).toBeTruthy();
      expect(inbound.direction).toBe('inbound');
      expect(inbound.customerPhone).toBe('9876543210');
      expect(inbound.content).toBe('Hi, I want a haircut');
      expect(inbound.messageType).toBe('text');

      // processMessage should have been called (OpenAI mock was invoked)
      expect(mockCreateFn).toHaveBeenCalled();

      // sendMessage should have been called with outbound payload
      expect(sendMessage).toHaveBeenCalled();

      // Outbound message should be logged
      const outbound = await MessageLog.findOne({ wamid: 'wamid.outbound-test-123' });
      expect(outbound).toBeTruthy();
      expect(outbound.direction).toBe('outbound');

      // markAsRead should have been called
      expect(markAsRead).toHaveBeenCalledWith(
        PHONE_NUMBER_ID,
        expect.any(String),
        'wamid.inbound-text-001'
      );
    });

    it('should deduplicate: same wamid twice → only 1 inbound, processMessage called once', async () => {
      await createConnectedSalon();

      const message = {
        id: 'wamid.dedup-test-001',
        from: '919876543210',
        timestamp: '1700000000',
        type: 'text',
        text: { body: 'Hello again' },
      };
      const body = buildWebhookPayload(PHONE_NUMBER_ID, message);

      // Send twice
      await postWebhook(body);
      await waitForAsync();
      await postWebhook(body);
      await waitForAsync();

      const logs = await MessageLog.find({ wamid: 'wamid.dedup-test-001' });
      expect(logs).toHaveLength(1);
      expect(mockCreateFn).toHaveBeenCalledTimes(1);
    });

    it('should extract text from button reply', async () => {
      await createConnectedSalon();

      const message = {
        id: 'wamid.button-reply-001',
        from: '919876543210',
        timestamp: '1700000000',
        type: 'interactive',
        interactive: {
          type: 'button_reply',
          button_reply: { id: 'btn_haircut', title: 'Haircut' },
        },
      };
      const body = buildWebhookPayload(PHONE_NUMBER_ID, message);

      await postWebhook(body);
      await waitForAsync();

      const inbound = await MessageLog.findOne({ wamid: 'wamid.button-reply-001' });
      expect(inbound).toBeTruthy();
      expect(inbound.content).toBe('Haircut');
      expect(mockCreateFn).toHaveBeenCalled();
    });

    it('should extract text from list reply', async () => {
      await createConnectedSalon();

      const message = {
        id: 'wamid.list-reply-001',
        from: '919876543210',
        timestamp: '1700000000',
        type: 'interactive',
        interactive: {
          type: 'list_reply',
          list_reply: { id: 'slot_1', title: '09:00 AM' },
        },
      };
      const body = buildWebhookPayload(PHONE_NUMBER_ID, message);

      await postWebhook(body);
      await waitForAsync();

      const inbound = await MessageLog.findOne({ wamid: 'wamid.list-reply-001' });
      expect(inbound).toBeTruthy();
      expect(inbound.content).toBe('09:00 AM');
      expect(mockCreateFn).toHaveBeenCalled();
    });

    it('should log unsupported type (image) but NOT call processMessage', async () => {
      await createConnectedSalon();

      const message = {
        id: 'wamid.image-001',
        from: '919876543210',
        timestamp: '1700000000',
        type: 'image',
        image: { id: 'img_123', mime_type: 'image/jpeg' },
      };
      const body = buildWebhookPayload(PHONE_NUMBER_ID, message);

      await postWebhook(body);
      await waitForAsync();

      // Inbound should be logged
      const inbound = await MessageLog.findOne({ wamid: 'wamid.image-001' });
      expect(inbound).toBeTruthy();
      expect(inbound.direction).toBe('inbound');
      expect(inbound.messageType).toBe('image');

      // processMessage (OpenAI) should NOT have been called
      expect(mockCreateFn).not.toHaveBeenCalled();

      // No outbound message should exist
      expect(sendMessage).not.toHaveBeenCalled();
    });

    it('should normalize phone: 919876543210 → stored as 9876543210', async () => {
      await createConnectedSalon();

      const message = {
        id: 'wamid.phone-norm-001',
        from: '919876543210',
        timestamp: '1700000000',
        type: 'text',
        text: { body: 'test' },
      };
      const body = buildWebhookPayload(PHONE_NUMBER_ID, message);

      await postWebhook(body);
      await waitForAsync();

      const inbound = await MessageLog.findOne({ wamid: 'wamid.phone-norm-001' });
      expect(inbound.customerPhone).toBe('9876543210');
    });

    it('should not process messages for unknown phoneNumberId', async () => {
      await createConnectedSalon();

      const message = {
        id: 'wamid.unknown-phone-001',
        from: '919876543210',
        timestamp: '1700000000',
        type: 'text',
        text: { body: 'Hello' },
      };
      const body = buildWebhookPayload('999999999', message);

      const res = await postWebhook(body);
      expect(res.status).toBe(200); // Always 200 for Meta

      await waitForAsync();

      // No messages should be logged
      const logs = await MessageLog.find({});
      expect(logs).toHaveLength(0);
      expect(mockCreateFn).not.toHaveBeenCalled();
    });
  });

  // ─── POST /webhook — Status Updates ───────────────────────

  describe('POST /webhook — status updates', () => {
    async function postWebhook(body) {
      const bodyStr = JSON.stringify(body);
      const signature = signPayload(bodyStr, APP_SECRET);

      return request(app)
        .post('/webhook')
        .set('Content-Type', 'application/json')
        .set('X-Hub-Signature-256', signature)
        .send(bodyStr);
    }

    it('should update MessageLog status on delivered event', async () => {
      const { salon } = await createConnectedSalon();

      // Pre-create an outbound message log
      await MessageLog.create({
        salonId: salon._id,
        wamid: 'wamid.outbound-status-001',
        direction: 'outbound',
        customerPhone: '9876543210',
        messageType: 'text',
        content: 'Hello!',
        status: 'sent',
      });

      const statusPayload = buildWebhookPayload(PHONE_NUMBER_ID, null, {
        statuses: [{
          id: 'wamid.outbound-status-001',
          status: 'delivered',
          timestamp: '1700000100',
          recipient_id: '919876543210',
        }],
      });

      await postWebhook(statusPayload);
      await waitForAsync();

      const log = await MessageLog.findOne({ wamid: 'wamid.outbound-status-001' });
      expect(log.status).toBe('delivered');
    });

    it('should store errorCode and errorMessage on failed status', async () => {
      const { salon } = await createConnectedSalon();

      await MessageLog.create({
        salonId: salon._id,
        wamid: 'wamid.outbound-fail-001',
        direction: 'outbound',
        customerPhone: '9876543210',
        messageType: 'text',
        content: 'Hello!',
        status: 'sent',
      });

      const statusPayload = buildWebhookPayload(PHONE_NUMBER_ID, null, {
        statuses: [{
          id: 'wamid.outbound-fail-001',
          status: 'failed',
          timestamp: '1700000200',
          recipient_id: '919876543210',
          errors: [{ code: 131047, title: 'Re-engagement message' }],
        }],
      });

      await postWebhook(statusPayload);
      await waitForAsync();

      const log = await MessageLog.findOne({ wamid: 'wamid.outbound-fail-001' });
      expect(log.status).toBe('failed');
      expect(log.errorCode).toBe(131047);
      expect(log.errorMessage).toBe('Re-engagement message');
    });
  });
});
