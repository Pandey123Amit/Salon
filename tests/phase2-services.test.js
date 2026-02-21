const request = require('supertest');
const app = require('../src/app');
const { connectDB, disconnectDB, clearDB } = require('./setup');
const { createSalonAndToken, createSecondSalon, createService, authHeader } = require('./helpers');

beforeAll(async () => { await connectDB(); });
afterAll(async () => { await disconnectDB(); });
afterEach(async () => { await clearDB(); });

describe('Phase 2 — Service CRUD', () => {
  // ─── List Services ───────────────────────────────────────────

  describe('GET /api/services', () => {
    it('should list active services for salon', async () => {
      const { salon, token } = await createSalonAndToken();
      await createService(salon._id, { name: 'Haircut' });
      await createService(salon._id, { name: 'Facial', category: 'Skin', price: 500 });

      const res = await request(app)
        .get('/api/services')
        .set(authHeader(token));

      expect(res.status).toBe(200);
      expect(res.body.data.services).toHaveLength(2);
    });

    it('should not list inactive services', async () => {
      const { salon, token } = await createSalonAndToken();
      await createService(salon._id, { name: 'Active Service' });
      await createService(salon._id, { name: 'Deleted Service', isActive: false });

      const res = await request(app)
        .get('/api/services')
        .set(authHeader(token));

      expect(res.body.data.services).toHaveLength(1);
      expect(res.body.data.services[0].name).toBe('Active Service');
    });

    it('should not show other salon services (tenant isolation)', async () => {
      const { salon, token } = await createSalonAndToken();
      const { salon: salon2 } = await createSecondSalon();
      await createService(salon._id, { name: 'My Service' });
      await createService(salon2._id, { name: 'Other Service' });

      const res = await request(app)
        .get('/api/services')
        .set(authHeader(token));

      expect(res.body.data.services).toHaveLength(1);
      expect(res.body.data.services[0].name).toBe('My Service');
    });
  });

  // ─── Create Service ──────────────────────────────────────────

  describe('POST /api/services', () => {
    it('should create a service', async () => {
      const { token } = await createSalonAndToken();
      const res = await request(app)
        .post('/api/services')
        .set(authHeader(token))
        .send({ name: 'Beard Trim', category: 'Beard', duration: 15, price: 100 });

      expect(res.status).toBe(201);
      expect(res.body.data.service.name).toBe('Beard Trim');
      expect(res.body.data.service.price).toBe(100);
    });

    it('should reject missing required fields', async () => {
      const { token } = await createSalonAndToken();
      const res = await request(app)
        .post('/api/services')
        .set(authHeader(token))
        .send({ name: 'Incomplete' });

      expect(res.status).toBe(400);
    });

    it('should reject invalid category', async () => {
      const { token } = await createSalonAndToken();
      const res = await request(app)
        .post('/api/services')
        .set(authHeader(token))
        .send({ name: 'Test', category: 'InvalidCategory', duration: 30, price: 100 });

      expect(res.status).toBe(400);
    });
  });

  // ─── Update Service ──────────────────────────────────────────

  describe('PUT /api/services/:id', () => {
    it('should update service price', async () => {
      const { salon, token } = await createSalonAndToken();
      const service = await createService(salon._id);

      const res = await request(app)
        .put(`/api/services/${service._id}`)
        .set(authHeader(token))
        .send({ price: 350 });

      expect(res.status).toBe(200);
      expect(res.body.data.service.price).toBe(350);
    });

    it('should return 404 for non-existent service', async () => {
      const { token } = await createSalonAndToken();
      const fakeId = '507f1f77bcf86cd799439011';

      const res = await request(app)
        .put(`/api/services/${fakeId}`)
        .set(authHeader(token))
        .send({ price: 999 });

      expect(res.status).toBe(404);
    });
  });

  // ─── Delete (Soft) Service ───────────────────────────────────

  describe('DELETE /api/services/:id', () => {
    it('should soft-delete a service', async () => {
      const { salon, token } = await createSalonAndToken();
      const service = await createService(salon._id);

      const res = await request(app)
        .delete(`/api/services/${service._id}`)
        .set(authHeader(token));

      expect(res.status).toBe(200);

      // Verify it no longer appears in list
      const listRes = await request(app)
        .get('/api/services')
        .set(authHeader(token));
      expect(listRes.body.data.services).toHaveLength(0);
    });
  });
});
