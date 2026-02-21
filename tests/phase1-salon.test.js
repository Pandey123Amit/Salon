const request = require('supertest');
const app = require('../src/app');
const { connectDB, disconnectDB, clearDB } = require('./setup');
const { createSalonAndToken, authHeader } = require('./helpers');

beforeAll(async () => { await connectDB(); });
afterAll(async () => { await disconnectDB(); });
afterEach(async () => { await clearDB(); });

describe('Phase 1 — Salon Profile & Settings', () => {
  // ─── Health Check ────────────────────────────────────────────

  describe('GET /health', () => {
    it('should return ok status', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.timestamp).toBeDefined();
    });
  });

  // ─── 404 Handler ─────────────────────────────────────────────

  describe('404 handler', () => {
    it('should return 404 for unknown routes', async () => {
      const res = await request(app).get('/api/nonexistent');
      expect(res.status).toBe(404);
    });
  });

  // ─── Get Profile ─────────────────────────────────────────────

  describe('GET /api/salon/profile', () => {
    it('should return salon profile', async () => {
      const { token } = await createSalonAndToken();
      const res = await request(app)
        .get('/api/salon/profile')
        .set(authHeader(token));

      expect(res.status).toBe(200);
      expect(res.body.data.salon.name).toBe('Test Salon');
      expect(res.body.data.salon.address.city).toBe('Bangalore');
    });

    it('should reject unauthenticated request', async () => {
      const res = await request(app).get('/api/salon/profile');
      expect(res.status).toBe(401);
    });
  });

  // ─── Update Profile ──────────────────────────────────────────

  describe('PUT /api/salon/profile', () => {
    it('should update salon name', async () => {
      const { token } = await createSalonAndToken();
      const res = await request(app)
        .put('/api/salon/profile')
        .set(authHeader(token))
        .send({ name: 'Updated Salon' });

      expect(res.status).toBe(200);
      expect(res.body.data.salon.name).toBe('Updated Salon');
    });

    it('should update address', async () => {
      const { token } = await createSalonAndToken();
      const res = await request(app)
        .put('/api/salon/profile')
        .set(authHeader(token))
        .send({ address: { street: '99 New St', city: 'Mumbai', state: 'Maharashtra', pincode: '400001' } });

      expect(res.status).toBe(200);
      expect(res.body.data.salon.address.city).toBe('Mumbai');
    });

    it('should not update disallowed fields like email', async () => {
      const { token } = await createSalonAndToken();
      const res = await request(app)
        .put('/api/salon/profile')
        .set(authHeader(token))
        .send({ email: 'hacked@evil.com' });

      expect(res.status).toBe(200);
      // Email should NOT have changed
      expect(res.body.data.salon.email).toBe('test@salon.com');
    });
  });

  // ─── Working Hours ───────────────────────────────────────────

  describe('PUT /api/salon/working-hours', () => {
    it('should update working hours', async () => {
      const { token } = await createSalonAndToken();
      const workingHours = [
        { day: 'monday', isOpen: true, openTime: '10:00', closeTime: '20:00' },
        { day: 'tuesday', isOpen: true, openTime: '10:00', closeTime: '20:00' },
        { day: 'wednesday', isOpen: true, openTime: '10:00', closeTime: '20:00' },
        { day: 'thursday', isOpen: true, openTime: '10:00', closeTime: '20:00' },
        { day: 'friday', isOpen: true, openTime: '10:00', closeTime: '20:00' },
        { day: 'saturday', isOpen: true, openTime: '10:00', closeTime: '18:00' },
        { day: 'sunday', isOpen: false, openTime: '10:00', closeTime: '18:00' },
      ];

      const res = await request(app)
        .put('/api/salon/working-hours')
        .set(authHeader(token))
        .send({ workingHours });

      expect(res.status).toBe(200);
      const monday = res.body.data.salon.workingHours.find((wh) => wh.day === 'monday');
      expect(monday.openTime).toBe('10:00');
      expect(monday.closeTime).toBe('20:00');
    });
  });

  // ─── Settings ────────────────────────────────────────────────

  describe('PUT /api/salon/settings', () => {
    it('should update slot duration', async () => {
      const { token } = await createSalonAndToken();
      const res = await request(app)
        .put('/api/salon/settings')
        .set(authHeader(token))
        .send({ slotDuration: 45 });

      expect(res.status).toBe(200);
      expect(res.body.data.salon.slotDuration).toBe(45);
    });

    it('should update buffer time', async () => {
      const { token } = await createSalonAndToken();
      const res = await request(app)
        .put('/api/salon/settings')
        .set(authHeader(token))
        .send({ bufferTime: 15 });

      expect(res.status).toBe(200);
      expect(res.body.data.salon.bufferTime).toBe(15);
    });

    it('should set holidays', async () => {
      const { token } = await createSalonAndToken();
      const holidays = ['2026-01-26', '2026-08-15'];
      const res = await request(app)
        .put('/api/salon/settings')
        .set(authHeader(token))
        .send({ holidays });

      expect(res.status).toBe(200);
      expect(res.body.data.salon.holidays).toHaveLength(2);
    });

    it('should reject invalid slot duration', async () => {
      const { token } = await createSalonAndToken();
      const res = await request(app)
        .put('/api/salon/settings')
        .set(authHeader(token))
        .send({ slotDuration: 25 });

      // 25 is not in [15, 30, 45, 60] — should fail validation
      expect(res.status).toBe(400);
    });
  });
});
