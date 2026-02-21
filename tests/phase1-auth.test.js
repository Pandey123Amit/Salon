const request = require('supertest');
const app = require('../src/app');
const { connectDB, disconnectDB, clearDB } = require('./setup');
const { createSalonAndToken, defaultSalonData, authHeader } = require('./helpers');

beforeAll(async () => { await connectDB(); });
afterAll(async () => { await disconnectDB(); });
afterEach(async () => { await clearDB(); });

describe('Phase 1 — Auth Endpoints', () => {
  // ─── Registration ────────────────────────────────────────────

  describe('POST /api/auth/register', () => {
    it('should register a new salon successfully', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send(defaultSalonData);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.salon.name).toBe('Test Salon');
      expect(res.body.data.salon.email).toBe('test@salon.com');
      // Password should not be in response
      expect(res.body.data.salon.password).toBeUndefined();
    });

    it('should reject duplicate email', async () => {
      await createSalonAndToken();
      const res = await request(app)
        .post('/api/auth/register')
        .send(defaultSalonData);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject duplicate phone', async () => {
      await createSalonAndToken();
      const res = await request(app)
        .post('/api/auth/register')
        .send({ ...defaultSalonData, email: 'other@test.com' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject missing required fields', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ name: 'Test' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject invalid phone format', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ ...defaultSalonData, phone: '12345' });

      expect(res.status).toBe(400);
    });

    it('should reject short password', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ ...defaultSalonData, phone: '9876543299', email: 'new@test.com', password: '123' });

      expect(res.status).toBe(400);
    });
  });

  // ─── Login ───────────────────────────────────────────────────

  describe('POST /api/auth/login', () => {
    it('should login with correct credentials', async () => {
      await createSalonAndToken();
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@salon.com', password: 'password123' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.salon.email).toBe('test@salon.com');
    });

    it('should reject wrong password', async () => {
      await createSalonAndToken();
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@salon.com', password: 'wrongpassword' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should reject non-existent email', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'noone@test.com', password: 'password123' });

      expect(res.status).toBe(401);
    });

    it('should reject missing fields', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({});

      expect(res.status).toBe(400);
    });
  });

  // ─── OTP Verification ───────────────────────────────────────

  describe('POST /api/auth/verify-otp', () => {
    it('should reject invalid OTP', async () => {
      await createSalonAndToken();
      const res = await request(app)
        .post('/api/auth/verify-otp')
        .send({ phone: '9876543210', otp: '000000' });

      // Either 400 (invalid OTP) or 400 (no OTP requested) depending on state
      expect(res.status).toBe(400);
    });

    it('should reject non-existent phone', async () => {
      const res = await request(app)
        .post('/api/auth/verify-otp')
        .send({ phone: '9999999999', otp: '123456' });

      expect(res.status).toBe(404);
    });
  });

  // ─── Get Me (Protected) ─────────────────────────────────────

  describe('GET /api/auth/me', () => {
    it('should return current salon when authenticated', async () => {
      const { token } = await createSalonAndToken();
      const res = await request(app)
        .get('/api/auth/me')
        .set(authHeader(token));

      expect(res.status).toBe(200);
      expect(res.body.data.salon.name).toBe('Test Salon');
    });

    it('should reject request without token', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
    });

    it('should reject invalid token', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set({ Authorization: 'Bearer invalidtoken123' });

      expect(res.status).toBe(401);
    });
  });
});
