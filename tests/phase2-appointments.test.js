const request = require('supertest');
const app = require('../src/app');
const { Appointment } = require('../src/models');
const { connectDB, disconnectDB, clearDB } = require('./setup');
const {
  createSalonAndToken, createService, createStaff, createCustomer,
  createFullSetup, getNextWeekday, authHeader,
} = require('./helpers');

beforeAll(async () => { await connectDB(); });
afterAll(async () => { await disconnectDB(); });
afterEach(async () => { await clearDB(); });

describe('Phase 2 — Appointments & Slot Availability', () => {
  // ─── Get Available Slots ─────────────────────────────────────

  describe('GET /api/appointments/slots', () => {
    it('should return available slots for a service on a weekday', async () => {
      const { salon, token, service, staff } = await createFullSetup();
      const date = getNextWeekday();

      const res = await request(app)
        .get(`/api/appointments/slots?date=${date}&serviceId=${service._id}`)
        .set(authHeader(token));

      expect(res.status).toBe(200);
      expect(res.body.data.slots).toBeDefined();
      expect(res.body.data.slots.length).toBeGreaterThan(0);
      // Each slot should have startTime, endTime, staffId, staffName
      const slot = res.body.data.slots[0];
      expect(slot.startTime).toBeDefined();
      expect(slot.endTime).toBeDefined();
      expect(slot.staffId).toBeDefined();
      expect(slot.staffName).toBe('Ravi');
    });

    it('should return empty slots for Sunday (closed day)', async () => {
      const { token, service } = await createFullSetup();
      // Find the next Sunday
      const date = new Date();
      while (date.getDay() !== 0) date.setDate(date.getDate() + 1);
      const sunday = date.toISOString().split('T')[0];

      const res = await request(app)
        .get(`/api/appointments/slots?date=${sunday}&serviceId=${service._id}`)
        .set(authHeader(token));

      expect(res.status).toBe(200);
      expect(res.body.data.slots).toHaveLength(0);
    });

    it('should return empty slots for a holiday', async () => {
      const { salon, token, service } = await createFullSetup();
      const date = getNextWeekday();

      // Mark that date as a holiday
      await request(app)
        .put('/api/salon/settings')
        .set(authHeader(token))
        .send({ holidays: [date] });

      const res = await request(app)
        .get(`/api/appointments/slots?date=${date}&serviceId=${service._id}`)
        .set(authHeader(token));

      expect(res.status).toBe(200);
      expect(res.body.data.slots).toHaveLength(0);
    });

    it('should reject missing date parameter', async () => {
      const { token, service } = await createFullSetup();

      const res = await request(app)
        .get(`/api/appointments/slots?serviceId=${service._id}`)
        .set(authHeader(token));

      expect(res.status).toBe(400);
    });

    it('should reject missing serviceId parameter', async () => {
      const { token } = await createFullSetup();
      const date = getNextWeekday();

      const res = await request(app)
        .get(`/api/appointments/slots?date=${date}`)
        .set(authHeader(token));

      expect(res.status).toBe(400);
    });
  });

  // ─── Create Appointment ──────────────────────────────────────

  describe('POST /api/appointments', () => {
    it('should create an appointment with valid slot', async () => {
      const { salon, token, service, staff, customer } = await createFullSetup();
      const date = getNextWeekday();

      // First get available slots
      const slotsRes = await request(app)
        .get(`/api/appointments/slots?date=${date}&serviceId=${service._id}`)
        .set(authHeader(token));
      const slot = slotsRes.body.data.slots[0];

      const res = await request(app)
        .post('/api/appointments')
        .set(authHeader(token))
        .send({
          customerId: customer._id.toString(),
          serviceId: service._id.toString(),
          date,
          startTime: slot.startTime,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.appointment.status).toBe('pending');
      expect(res.body.data.appointment.startTime).toBe(slot.startTime);
    });

    it('should reject booking on unavailable slot', async () => {
      const { salon, token, service, customer } = await createFullSetup();
      // Find next Sunday (closed)
      const date = new Date();
      while (date.getDay() !== 0) date.setDate(date.getDate() + 1);
      const sunday = date.toISOString().split('T')[0];

      const res = await request(app)
        .post('/api/appointments')
        .set(authHeader(token))
        .send({
          customerId: customer._id.toString(),
          serviceId: service._id.toString(),
          date: sunday,
          startTime: '10:00',
        });

      expect(res.status).toBe(400);
    });

    it('should prevent double-booking same slot', async () => {
      const { token, service, customer } = await createFullSetup();
      const date = getNextWeekday();

      // Get slots
      const slotsRes = await request(app)
        .get(`/api/appointments/slots?date=${date}&serviceId=${service._id}`)
        .set(authHeader(token));
      const slot = slotsRes.body.data.slots[0];

      // Book first appointment
      await request(app)
        .post('/api/appointments')
        .set(authHeader(token))
        .send({
          customerId: customer._id.toString(),
          serviceId: service._id.toString(),
          date,
          startTime: slot.startTime,
          staffId: slot.staffId,
        });

      // Try to book the same slot again
      const res = await request(app)
        .post('/api/appointments')
        .set(authHeader(token))
        .send({
          customerId: customer._id.toString(),
          serviceId: service._id.toString(),
          date,
          startTime: slot.startTime,
          staffId: slot.staffId,
        });

      expect(res.status).toBe(400);
    });

    it('should reject non-existent customer', async () => {
      const { token, service } = await createFullSetup();
      const date = getNextWeekday();

      const res = await request(app)
        .post('/api/appointments')
        .set(authHeader(token))
        .send({
          customerId: '507f1f77bcf86cd799439011',
          serviceId: service._id.toString(),
          date,
          startTime: '10:00',
        });

      expect(res.status).toBe(404);
    });

    it('should reject non-existent service', async () => {
      const { token, customer } = await createFullSetup();
      const date = getNextWeekday();

      const res = await request(app)
        .post('/api/appointments')
        .set(authHeader(token))
        .send({
          customerId: customer._id.toString(),
          serviceId: '507f1f77bcf86cd799439011',
          date,
          startTime: '10:00',
        });

      expect(res.status).toBe(404);
    });
  });

  // ─── List Appointments ───────────────────────────────────────

  describe('GET /api/appointments', () => {
    it('should list all appointments', async () => {
      const { token, service, staff, customer, salon } = await createFullSetup();
      const date = getNextWeekday();

      // Create an appointment directly
      await Appointment.create({
        salonId: salon._id,
        customerId: customer._id,
        serviceId: service._id,
        staffId: staff._id,
        date: new Date(date),
        startTime: '10:00',
        endTime: '10:30',
        duration: 30,
        price: 200,
      });

      const res = await request(app)
        .get('/api/appointments')
        .set(authHeader(token));

      expect(res.status).toBe(200);
      expect(res.body.data.appointments).toHaveLength(1);
    });

    it('should filter by status', async () => {
      const { token, service, staff, customer, salon } = await createFullSetup();
      const date = getNextWeekday();

      await Appointment.create({
        salonId: salon._id, customerId: customer._id, serviceId: service._id,
        staffId: staff._id, date: new Date(date),
        startTime: '10:00', endTime: '10:30', duration: 30, price: 200, status: 'confirmed',
      });
      await Appointment.create({
        salonId: salon._id, customerId: customer._id, serviceId: service._id,
        staffId: staff._id, date: new Date(date),
        startTime: '11:00', endTime: '11:30', duration: 30, price: 200, status: 'cancelled',
      });

      const res = await request(app)
        .get('/api/appointments?status=confirmed')
        .set(authHeader(token));

      expect(res.body.data.appointments).toHaveLength(1);
      expect(res.body.data.appointments[0].status).toBe('confirmed');
    });
  });

  // ─── Today's Appointments ────────────────────────────────────

  describe('GET /api/appointments/today', () => {
    it('should list only today appointments', async () => {
      const { token, service, staff, customer, salon } = await createFullSetup();
      const today = new Date();
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      await Appointment.create({
        salonId: salon._id, customerId: customer._id, serviceId: service._id,
        staffId: staff._id, date: today,
        startTime: '14:00', endTime: '14:30', duration: 30, price: 200,
      });
      await Appointment.create({
        salonId: salon._id, customerId: customer._id, serviceId: service._id,
        staffId: staff._id, date: tomorrow,
        startTime: '14:00', endTime: '14:30', duration: 30, price: 200,
      });

      const res = await request(app)
        .get('/api/appointments/today')
        .set(authHeader(token));

      expect(res.status).toBe(200);
      expect(res.body.data.appointments).toHaveLength(1);
    });
  });

  // ─── Update Appointment Status ───────────────────────────────

  describe('PUT /api/appointments/:id', () => {
    let token, salon, service, staff, customer;

    beforeEach(async () => {
      const setup = await createFullSetup();
      token = setup.token;
      salon = setup.salon;
      service = setup.service;
      staff = setup.staff;
      customer = setup.customer;
    });

    async function createTestAppointment(status = 'pending') {
      return Appointment.create({
        salonId: salon._id, customerId: customer._id, serviceId: service._id,
        staffId: staff._id, date: new Date(), startTime: '10:00', endTime: '10:30',
        duration: 30, price: 200, status,
      });
    }

    it('should transition pending → confirmed', async () => {
      const appt = await createTestAppointment('pending');
      const res = await request(app)
        .put(`/api/appointments/${appt._id}`)
        .set(authHeader(token))
        .send({ status: 'confirmed' });

      expect(res.status).toBe(200);
      expect(res.body.data.appointment.status).toBe('confirmed');
    });

    it('should transition confirmed → in-progress', async () => {
      const appt = await createTestAppointment('confirmed');
      const res = await request(app)
        .put(`/api/appointments/${appt._id}`)
        .set(authHeader(token))
        .send({ status: 'in-progress' });

      expect(res.status).toBe(200);
      expect(res.body.data.appointment.status).toBe('in-progress');
    });

    it('should transition in-progress → completed and update customer stats', async () => {
      const appt = await createTestAppointment('in-progress');
      const res = await request(app)
        .put(`/api/appointments/${appt._id}`)
        .set(authHeader(token))
        .send({ status: 'completed' });

      expect(res.status).toBe(200);
      expect(res.body.data.appointment.status).toBe('completed');

      // Verify customer totalVisits incremented
      const { Customer } = require('../src/models');
      const updatedCustomer = await Customer.findById(customer._id);
      expect(updatedCustomer.totalVisits).toBe(1);
      expect(updatedCustomer.lastVisit).toBeDefined();
    });

    it('should transition pending → cancelled with reason', async () => {
      const appt = await createTestAppointment('pending');
      const res = await request(app)
        .put(`/api/appointments/${appt._id}`)
        .set(authHeader(token))
        .send({ status: 'cancelled', cancelReason: 'Customer requested' });

      expect(res.status).toBe(200);
      expect(res.body.data.appointment.status).toBe('cancelled');
    });

    it('should reject invalid transition: completed → pending', async () => {
      const appt = await createTestAppointment('completed');
      const res = await request(app)
        .put(`/api/appointments/${appt._id}`)
        .set(authHeader(token))
        .send({ status: 'pending' });

      expect(res.status).toBe(400);
    });

    it('should reject invalid transition: cancelled → confirmed', async () => {
      const appt = await createTestAppointment('cancelled');
      const res = await request(app)
        .put(`/api/appointments/${appt._id}`)
        .set(authHeader(token))
        .send({ status: 'confirmed' });

      expect(res.status).toBe(400);
    });

    it('should return 404 for non-existent appointment', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const res = await request(app)
        .put(`/api/appointments/${fakeId}`)
        .set(authHeader(token))
        .send({ status: 'confirmed' });

      expect(res.status).toBe(404);
    });
  });
});
