const request = require('supertest');
const app = require('../src/app');
const { Salon } = require('../src/models');
const { connectDB, disconnectDB, clearDB } = require('./setup');
const { createSalonAndToken, createSecondSalon, authHeader } = require('./helpers');

beforeAll(async () => { await connectDB(); });
afterAll(async () => { await disconnectDB(); });
afterEach(async () => { await clearDB(); });

describe('Phase 4 — WhatsApp Onboarding Endpoints', () => {
  // ─── POST /api/salon/whatsapp/connect ─────────────────────

  describe('POST /api/salon/whatsapp/connect', () => {
    it('should connect WhatsApp with valid credentials', async () => {
      const { token } = await createSalonAndToken();

      const res = await request(app)
        .post('/api/salon/whatsapp/connect')
        .set(authHeader(token))
        .send({
          phoneNumberId: '109876543210',
          accessToken: 'EAABsbCS1iHgBO-very-long-access-token',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.phoneNumberId).toBe('109876543210');
      expect(res.body.data.isConnected).toBe(true);
      expect(res.body.data.connectedAt).toBeDefined();

      // Verify accessToken is encrypted in DB (not plain text)
      const salon = await Salon.findOne({ 'whatsapp.phoneNumberId': '109876543210' })
        .select('+whatsapp.accessToken');
      expect(salon.whatsapp.isConnected).toBe(true);
      expect(salon.whatsapp.accessToken).toBeDefined();
      expect(salon.whatsapp.accessToken).not.toBe('EAABsbCS1iHgBO-very-long-access-token');
      // Encrypted format: iv:authTag:ciphertext
      expect(salon.whatsapp.accessToken.split(':')).toHaveLength(3);
    });

    it('should reject missing phoneNumberId', async () => {
      const { token } = await createSalonAndToken();

      const res = await request(app)
        .post('/api/salon/whatsapp/connect')
        .set(authHeader(token))
        .send({ accessToken: 'EAABsbCS1iHg-long-access-token' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject missing accessToken', async () => {
      const { token } = await createSalonAndToken();

      const res = await request(app)
        .post('/api/salon/whatsapp/connect')
        .set(authHeader(token))
        .send({ phoneNumberId: '109876543210' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject short accessToken', async () => {
      const { token } = await createSalonAndToken();

      const res = await request(app)
        .post('/api/salon/whatsapp/connect')
        .set(authHeader(token))
        .send({ phoneNumberId: '109876543210', accessToken: 'short' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject duplicate phoneNumberId (another salon)', async () => {
      const { salon: salon1, token: token1 } = await createSalonAndToken();

      // First salon connects
      await request(app)
        .post('/api/salon/whatsapp/connect')
        .set(authHeader(token1))
        .send({
          phoneNumberId: '109876543210',
          accessToken: 'EAABsbCS1iHg-long-token-first',
        });

      // Second salon tries the same phoneNumberId
      const { token: token2 } = await createSecondSalon();
      const res = await request(app)
        .post('/api/salon/whatsapp/connect')
        .set(authHeader(token2))
        .send({
          phoneNumberId: '109876543210',
          accessToken: 'EAABsbCS1iHg-long-token-second',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject request without auth token', async () => {
      const res = await request(app)
        .post('/api/salon/whatsapp/connect')
        .send({
          phoneNumberId: '109876543210',
          accessToken: 'EAABsbCS1iHg-long-access-token',
        });

      expect(res.status).toBe(401);
    });
  });

  // ─── DELETE /api/salon/whatsapp/disconnect ─────────────────

  describe('DELETE /api/salon/whatsapp/disconnect', () => {
    it('should disconnect a connected salon', async () => {
      const { token } = await createSalonAndToken();

      // Connect first
      await request(app)
        .post('/api/salon/whatsapp/connect')
        .set(authHeader(token))
        .send({
          phoneNumberId: '109876543210',
          accessToken: 'EAABsbCS1iHg-long-access-token',
        });

      // Disconnect
      const res = await request(app)
        .delete('/api/salon/whatsapp/disconnect')
        .set(authHeader(token));

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify fields are cleared in DB
      const salon = await Salon.findOne({ email: 'test@salon.com' })
        .select('+whatsapp.accessToken');
      expect(salon.whatsapp.isConnected).toBe(false);
      expect(salon.whatsapp.accessToken).toBeUndefined();
      expect(salon.whatsapp.phoneNumberId).toBeUndefined();
    });

    it('should reject request without auth token', async () => {
      const res = await request(app)
        .delete('/api/salon/whatsapp/disconnect');

      expect(res.status).toBe(401);
    });
  });

  // ─── GET /api/salon/whatsapp/status ────────────────────────

  describe('GET /api/salon/whatsapp/status', () => {
    it('should return connected status for a connected salon', async () => {
      const { token } = await createSalonAndToken();

      // Connect first
      await request(app)
        .post('/api/salon/whatsapp/connect')
        .set(authHeader(token))
        .send({
          phoneNumberId: '109876543210',
          accessToken: 'EAABsbCS1iHg-long-access-token',
        });

      const res = await request(app)
        .get('/api/salon/whatsapp/status')
        .set(authHeader(token));

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.isConnected).toBe(true);
      expect(res.body.data.phoneNumberId).toBe('109876543210');
      expect(res.body.data.connectedAt).toBeDefined();
    });

    it('should return disconnected status for an unconnected salon', async () => {
      const { token } = await createSalonAndToken();

      const res = await request(app)
        .get('/api/salon/whatsapp/status')
        .set(authHeader(token));

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.isConnected).toBe(false);
    });

    it('should reject request without auth token', async () => {
      const res = await request(app)
        .get('/api/salon/whatsapp/status');

      expect(res.status).toBe(401);
    });
  });
});
