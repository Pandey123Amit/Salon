const request = require('supertest');
const app = require('../src/app');
const { connectDB, disconnectDB, clearDB } = require('./setup');
const { createSalonAndToken, createService, createStaff, authHeader } = require('./helpers');

beforeAll(async () => { await connectDB(); });
afterAll(async () => { await disconnectDB(); });
afterEach(async () => { await clearDB(); });

describe('Phase 2 — Staff CRUD', () => {
  // ─── List Staff ──────────────────────────────────────────────

  describe('GET /api/staff', () => {
    it('should list active staff', async () => {
      const { salon, token } = await createSalonAndToken();
      const service = await createService(salon._id);
      await createStaff(salon._id, [service._id]);
      await createStaff(salon._id, [service._id], { name: 'Priya', phone: '9876543212' });

      const res = await request(app)
        .get('/api/staff')
        .set(authHeader(token));

      expect(res.status).toBe(200);
      expect(res.body.data.staff).toHaveLength(2);
    });

    it('should populate service names', async () => {
      const { salon, token } = await createSalonAndToken();
      const service = await createService(salon._id, { name: 'Facial' });
      await createStaff(salon._id, [service._id]);

      const res = await request(app)
        .get('/api/staff')
        .set(authHeader(token));

      expect(res.body.data.staff[0].services[0].name).toBe('Facial');
    });
  });

  // ─── Create Staff ────────────────────────────────────────────

  describe('POST /api/staff', () => {
    it('should create a staff member', async () => {
      const { salon, token } = await createSalonAndToken();
      const service = await createService(salon._id);

      const res = await request(app)
        .post('/api/staff')
        .set(authHeader(token))
        .send({
          name: 'Amit',
          phone: '9876543213',
          role: 'Senior Stylist',
          services: [service._id],
        });

      expect(res.status).toBe(201);
      expect(res.body.data.staff.name).toBe('Amit');
      expect(res.body.data.staff.role).toBe('Senior Stylist');
    });

    it('should reject missing name', async () => {
      const { token } = await createSalonAndToken();
      const res = await request(app)
        .post('/api/staff')
        .set(authHeader(token))
        .send({ phone: '9876543213' });

      expect(res.status).toBe(400);
    });
  });

  // ─── Update Staff ────────────────────────────────────────────

  describe('PUT /api/staff/:id', () => {
    it('should update staff name', async () => {
      const { salon, token } = await createSalonAndToken();
      const staff = await createStaff(salon._id);

      const res = await request(app)
        .put(`/api/staff/${staff._id}`)
        .set(authHeader(token))
        .send({ name: 'Ravi Kumar' });

      expect(res.status).toBe(200);
      expect(res.body.data.staff.name).toBe('Ravi Kumar');
    });
  });

  // ─── Delete (Soft) Staff ─────────────────────────────────────

  describe('DELETE /api/staff/:id', () => {
    it('should soft-delete a staff member', async () => {
      const { salon, token } = await createSalonAndToken();
      const staff = await createStaff(salon._id);

      const res = await request(app)
        .delete(`/api/staff/${staff._id}`)
        .set(authHeader(token));

      expect(res.status).toBe(200);

      // Should not appear in list anymore
      const listRes = await request(app)
        .get('/api/staff')
        .set(authHeader(token));
      expect(listRes.body.data.staff).toHaveLength(0);
    });
  });
});
