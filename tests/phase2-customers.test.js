const request = require('supertest');
const app = require('../src/app');
const { connectDB, disconnectDB, clearDB } = require('./setup');
const { createSalonAndToken, createCustomer, createSecondSalon, authHeader } = require('./helpers');

beforeAll(async () => { await connectDB(); });
afterAll(async () => { await disconnectDB(); });
afterEach(async () => { await clearDB(); });

describe('Phase 2 — Customer CRUD', () => {
  // ─── List Customers ──────────────────────────────────────────

  describe('GET /api/customers', () => {
    it('should list customers for salon', async () => {
      const { salon, token } = await createSalonAndToken();
      await createCustomer(salon._id, { name: 'Rahul', phone: '9123456789' });
      await createCustomer(salon._id, { name: 'Priya', phone: '9123456780' });

      const res = await request(app)
        .get('/api/customers')
        .set(authHeader(token));

      expect(res.status).toBe(200);
      expect(res.body.data.customers).toHaveLength(2);
    });

    it('should search customers by name', async () => {
      const { salon, token } = await createSalonAndToken();
      await createCustomer(salon._id, { name: 'Rahul Kumar', phone: '9123456789' });
      await createCustomer(salon._id, { name: 'Priya Singh', phone: '9123456780' });

      const res = await request(app)
        .get('/api/customers?search=Rahul')
        .set(authHeader(token));

      expect(res.body.data.customers).toHaveLength(1);
      expect(res.body.data.customers[0].name).toBe('Rahul Kumar');
    });

    it('should search customers by phone', async () => {
      const { salon, token } = await createSalonAndToken();
      await createCustomer(salon._id, { name: 'Rahul', phone: '9123456789' });

      const res = await request(app)
        .get('/api/customers?search=91234')
        .set(authHeader(token));

      expect(res.body.data.customers).toHaveLength(1);
    });

    it('should not show other salon customers (tenant isolation)', async () => {
      const { salon, token } = await createSalonAndToken();
      const { salon: salon2 } = await createSecondSalon();
      await createCustomer(salon._id, { phone: '9123456789' });
      await createCustomer(salon2._id, { phone: '9123456780' });

      const res = await request(app)
        .get('/api/customers')
        .set(authHeader(token));

      expect(res.body.data.customers).toHaveLength(1);
    });
  });

  // ─── Get Customer ────────────────────────────────────────────

  describe('GET /api/customers/:id', () => {
    it('should get customer with appointment history', async () => {
      const { salon, token } = await createSalonAndToken();
      const customer = await createCustomer(salon._id);

      const res = await request(app)
        .get(`/api/customers/${customer._id}`)
        .set(authHeader(token));

      expect(res.status).toBe(200);
      expect(res.body.data.customer.name).toBe('Rahul Kumar');
      expect(res.body.data.appointments).toBeDefined();
    });

    it('should return 404 for non-existent customer', async () => {
      const { token } = await createSalonAndToken();
      const fakeId = '507f1f77bcf86cd799439011';

      const res = await request(app)
        .get(`/api/customers/${fakeId}`)
        .set(authHeader(token));

      expect(res.status).toBe(404);
    });
  });

  // ─── Update Customer ─────────────────────────────────────────

  describe('PUT /api/customers/:id', () => {
    it('should update customer name', async () => {
      const { salon, token } = await createSalonAndToken();
      const customer = await createCustomer(salon._id);

      const res = await request(app)
        .put(`/api/customers/${customer._id}`)
        .set(authHeader(token))
        .send({ name: 'Rahul Sharma' });

      expect(res.status).toBe(200);
      expect(res.body.data.customer.name).toBe('Rahul Sharma');
    });
  });

  // ─── Due Revisit ─────────────────────────────────────────────

  describe('GET /api/customers/due-revisit', () => {
    it('should list customers with lastVisit > 30 days ago', async () => {
      const { salon, token } = await createSalonAndToken();
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 45);

      await createCustomer(salon._id, {
        name: 'Old Customer',
        phone: '9123456789',
        lastVisit: oldDate,
      });
      await createCustomer(salon._id, {
        name: 'Recent Customer',
        phone: '9123456780',
        lastVisit: new Date(),
      });

      const res = await request(app)
        .get('/api/customers/due-revisit')
        .set(authHeader(token));

      expect(res.status).toBe(200);
      expect(res.body.data.customers).toHaveLength(1);
      expect(res.body.data.customers[0].name).toBe('Old Customer');
    });
  });
});
