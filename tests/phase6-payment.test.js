const request = require('supertest');
const crypto = require('crypto');
const app = require('../src/app');
const { Payment, Appointment, Salon } = require('../src/models');
const { connectDB, disconnectDB, clearDB } = require('./setup');
const {
  createSalonAndToken, createSecondSalon, createFullSetup,
  getNextWeekday, authHeader,
} = require('./helpers');

// Mock Razorpay SDK
const mockPaymentLinkCreate = jest.fn();
const mockOrdersCreate = jest.fn();
const mockPaymentsRefund = jest.fn();

jest.mock('razorpay', () => {
  return jest.fn().mockImplementation(() => ({
    paymentLink: { create: mockPaymentLinkCreate },
    orders: { create: mockOrdersCreate },
    payments: { refund: mockPaymentsRefund },
  }));
});

beforeAll(async () => { await connectDB(); });
afterAll(async () => { await disconnectDB(); });
afterEach(async () => {
  await clearDB();
  jest.clearAllMocks();
});

describe('Phase 6 — Payments', () => {
  // ─── Payment Model CRUD ──────────────────────────────────────
  describe('Payment model', () => {
    it('should create a payment record', async () => {
      const { salon, service, staff, customer } = await createFullSetup();
      const appointment = await Appointment.create({
        salonId: salon._id,
        customerId: customer._id,
        serviceId: service._id,
        staffId: staff._id,
        date: new Date(),
        startTime: '10:00',
        endTime: '10:30',
        duration: 30,
        price: 200,
        status: 'confirmed',
      });

      const payment = await Payment.create({
        salonId: salon._id,
        appointmentId: appointment._id,
        customerId: customer._id,
        amount: 20000,
        currency: 'INR',
        status: 'pending',
        razorpayPaymentLinkId: 'plink_test123',
        paymentLinkUrl: 'https://rzp.io/test123',
      });

      expect(payment.amount).toBe(20000);
      expect(payment.status).toBe('pending');
      expect(payment.razorpayPaymentLinkId).toBe('plink_test123');
    });

    it('should enforce required fields', async () => {
      await expect(Payment.create({})).rejects.toThrow();
    });
  });

  // ─── Payment API ─────────────────────────────────────────────
  describe('POST /api/payments/link — create payment link', () => {
    it('should create a payment link for an appointment', async () => {
      const { salon, token, service, staff, customer } = await createFullSetup();

      // Enable payments on salon
      await Salon.findByIdAndUpdate(salon._id, {
        'payment.isPaymentEnabled': true,
      });

      const appointment = await Appointment.create({
        salonId: salon._id,
        customerId: customer._id,
        serviceId: service._id,
        staffId: staff._id,
        date: new Date(),
        startTime: '10:00',
        endTime: '10:30',
        duration: 30,
        price: 200,
        status: 'confirmed',
      });

      mockPaymentLinkCreate.mockResolvedValue({
        id: 'plink_test456',
        short_url: 'https://rzp.io/test456',
      });

      const res = await request(app)
        .post('/api/payments/link')
        .set(authHeader(token))
        .send({ appointmentId: appointment._id.toString() });

      expect(res.status).toBe(201);
      expect(res.body.data.paymentLinkUrl).toBe('https://rzp.io/test456');
      expect(mockPaymentLinkCreate).toHaveBeenCalledTimes(1);

      // Verify payment record was created
      const payment = await Payment.findOne({ appointmentId: appointment._id });
      expect(payment).toBeTruthy();
      expect(payment.status).toBe('pending');
    });

    it('should return 404 for non-existent appointment', async () => {
      const { token } = await createSalonAndToken();
      const fakeId = '507f1f77bcf86cd799439011';

      const res = await request(app)
        .post('/api/payments/link')
        .set(authHeader(token))
        .send({ appointmentId: fakeId });

      expect(res.status).toBe(404);
    });

    it('should reject missing appointmentId', async () => {
      const { token } = await createSalonAndToken();

      const res = await request(app)
        .post('/api/payments/link')
        .set(authHeader(token))
        .send({});

      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/payments/order — create Razorpay order', () => {
    it('should create an order for dashboard checkout', async () => {
      const { salon, token, service, staff, customer } = await createFullSetup();

      const appointment = await Appointment.create({
        salonId: salon._id,
        customerId: customer._id,
        serviceId: service._id,
        staffId: staff._id,
        date: new Date(),
        startTime: '11:00',
        endTime: '11:30',
        duration: 30,
        price: 500,
        status: 'confirmed',
      });

      mockOrdersCreate.mockResolvedValue({
        id: 'order_test789',
        amount: 50000,
        currency: 'INR',
      });

      const res = await request(app)
        .post('/api/payments/order')
        .set(authHeader(token))
        .send({ appointmentId: appointment._id.toString() });

      expect(res.status).toBe(201);
      expect(res.body.data.orderId).toBe('order_test789');
      expect(res.body.data.amount).toBe(50000);
    });
  });

  describe('POST /api/payments/verify — verify payment', () => {
    it('should verify a valid payment signature', async () => {
      const { salon, token, service, staff, customer } = await createFullSetup();

      const appointment = await Appointment.create({
        salonId: salon._id,
        customerId: customer._id,
        serviceId: service._id,
        staffId: staff._id,
        date: new Date(),
        startTime: '12:00',
        endTime: '12:30',
        duration: 30,
        price: 300,
        status: 'confirmed',
      });

      // Create payment record
      await Payment.create({
        salonId: salon._id,
        appointmentId: appointment._id,
        customerId: customer._id,
        razorpayOrderId: 'order_verify_test',
        amount: 30000,
        status: 'pending',
      });

      // Generate valid signature
      const secret = process.env.RAZORPAY_KEY_SECRET || '';
      const body = 'order_verify_test|pay_test_123';
      const signature = crypto.createHmac('sha256', secret).update(body).digest('hex');

      const res = await request(app)
        .post('/api/payments/verify')
        .set(authHeader(token))
        .send({
          orderId: 'order_verify_test',
          paymentId: 'pay_test_123',
          signature,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.verified).toBe(true);
    });

    it('should reject invalid signature', async () => {
      const { token } = await createSalonAndToken();

      const res = await request(app)
        .post('/api/payments/verify')
        .set(authHeader(token))
        .send({
          orderId: 'order_test',
          paymentId: 'pay_test',
          signature: 'invalid_signature',
        });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/payments — list payments', () => {
    it('should list salon payments', async () => {
      const { salon, token, service, staff, customer } = await createFullSetup();

      const appointment = await Appointment.create({
        salonId: salon._id,
        customerId: customer._id,
        serviceId: service._id,
        staffId: staff._id,
        date: new Date(),
        startTime: '14:00',
        endTime: '14:30',
        duration: 30,
        price: 200,
        status: 'confirmed',
      });

      await Payment.create({
        salonId: salon._id,
        appointmentId: appointment._id,
        customerId: customer._id,
        amount: 20000,
        status: 'paid',
      });

      const res = await request(app)
        .get('/api/payments')
        .set(authHeader(token));

      expect(res.status).toBe(200);
      expect(res.body.data.payments).toHaveLength(1);
      expect(res.body.data.payments[0].amount).toBe(20000);
    });

    it('should not show payments from another salon', async () => {
      const { salon, service, staff, customer } = await createFullSetup();
      const { token: otherToken } = await createSecondSalon();

      const appointment = await Appointment.create({
        salonId: salon._id,
        customerId: customer._id,
        serviceId: service._id,
        staffId: staff._id,
        date: new Date(),
        startTime: '15:00',
        endTime: '15:30',
        duration: 30,
        price: 200,
        status: 'confirmed',
      });

      await Payment.create({
        salonId: salon._id,
        appointmentId: appointment._id,
        customerId: customer._id,
        amount: 20000,
        status: 'paid',
      });

      const res = await request(app)
        .get('/api/payments')
        .set(authHeader(otherToken));

      expect(res.status).toBe(200);
      expect(res.body.data.payments).toHaveLength(0);
    });
  });

  describe('POST /api/payments/:paymentId/refund — refund', () => {
    it('should initiate a refund', async () => {
      const { salon, token, service, staff, customer } = await createFullSetup();

      const appointment = await Appointment.create({
        salonId: salon._id,
        customerId: customer._id,
        serviceId: service._id,
        staffId: staff._id,
        date: new Date(),
        startTime: '16:00',
        endTime: '16:30',
        duration: 30,
        price: 400,
        status: 'confirmed',
      });

      const payment = await Payment.create({
        salonId: salon._id,
        appointmentId: appointment._id,
        customerId: customer._id,
        amount: 40000,
        status: 'paid',
        razorpayPaymentId: 'pay_refund_test',
      });

      mockPaymentsRefund.mockResolvedValue({ id: 'rfnd_test123' });

      const res = await request(app)
        .post(`/api/payments/${payment._id}/refund`)
        .set(authHeader(token))
        .send({ reason: 'Customer request' });

      expect(res.status).toBe(200);
      expect(res.body.data.refundId).toBe('rfnd_test123');
      expect(res.body.data.status).toBe('refunded');
    });

    it('should not refund another salon\'s payment', async () => {
      const { salon, service, staff, customer } = await createFullSetup();
      const { token: otherToken } = await createSecondSalon();

      const appointment = await Appointment.create({
        salonId: salon._id,
        customerId: customer._id,
        serviceId: service._id,
        staffId: staff._id,
        date: new Date(),
        startTime: '17:00',
        endTime: '17:30',
        duration: 30,
        price: 200,
        status: 'confirmed',
      });

      const payment = await Payment.create({
        salonId: salon._id,
        appointmentId: appointment._id,
        customerId: customer._id,
        amount: 20000,
        status: 'paid',
        razorpayPaymentId: 'pay_cross_test',
      });

      const res = await request(app)
        .post(`/api/payments/${payment._id}/refund`)
        .set(authHeader(otherToken))
        .send({});

      expect(res.status).toBe(404);
    });
  });

  // ─── Razorpay Webhook ────────────────────────────────────────
  describe('POST /razorpay-webhook', () => {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || '';

    function signRazorpayPayload(body, secret) {
      const raw = typeof body === 'string' ? body : JSON.stringify(body);
      return crypto.createHmac('sha256', secret).update(raw).digest('hex');
    }

    it('should reject missing signature', async () => {
      const res = await request(app)
        .post('/razorpay-webhook')
        .send({ event: 'test' });

      expect(res.status).toBe(401);
    });

    it('should reject invalid signature', async () => {
      const res = await request(app)
        .post('/razorpay-webhook')
        .set('X-Razorpay-Signature', 'invalid_sig')
        .send({ event: 'test' });

      expect(res.status).toBe(401);
    });

    it('should process payment_link.paid event', async () => {
      const { salon, service, staff, customer } = await createFullSetup();

      const appointment = await Appointment.create({
        salonId: salon._id,
        customerId: customer._id,
        serviceId: service._id,
        staffId: staff._id,
        date: new Date(),
        startTime: '10:00',
        endTime: '10:30',
        duration: 30,
        price: 200,
        status: 'confirmed',
        payment: { status: 'pending' },
      });

      await Payment.create({
        salonId: salon._id,
        appointmentId: appointment._id,
        customerId: customer._id,
        razorpayPaymentLinkId: 'plink_webhook_test',
        amount: 20000,
        status: 'pending',
      });

      const payload = {
        event: 'payment_link.paid',
        payload: {
          payment_link: { entity: { id: 'plink_webhook_test' } },
          payment: { entity: { id: 'pay_wh_123', method: 'upi' } },
        },
      };

      const signature = signRazorpayPayload(payload, webhookSecret);

      const res = await request(app)
        .post('/razorpay-webhook')
        .set('X-Razorpay-Signature', signature)
        .send(payload);

      expect(res.status).toBe(200);

      // Wait for async processing
      await new Promise((r) => setTimeout(r, 200));

      const updatedPayment = await Payment.findOne({ razorpayPaymentLinkId: 'plink_webhook_test' });
      expect(updatedPayment.status).toBe('paid');
      expect(updatedPayment.razorpayPaymentId).toBe('pay_wh_123');
      expect(updatedPayment.method).toBe('upi');

      const updatedAppointment = await Appointment.findById(appointment._id);
      expect(updatedAppointment.payment.status).toBe('paid');
    });
  });

  // ─── Salon Payment Settings ──────────────────────────────────
  describe('PUT /api/salon/payment-settings', () => {
    it('should update payment settings', async () => {
      const { token } = await createSalonAndToken();

      const res = await request(app)
        .put('/api/salon/payment-settings')
        .set(authHeader(token))
        .send({
          isPaymentEnabled: true,
          paymentMode: 'required',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.salon.payment.isPaymentEnabled).toBe(true);
      expect(res.body.data.salon.payment.paymentMode).toBe('required');
    });

    it('should encrypt razorpayKeySecret when saving', async () => {
      // This test requires WHATSAPP_ENCRYPTION_KEY to be set
      if (!process.env.WHATSAPP_ENCRYPTION_KEY) return;

      const { salon, token } = await createSalonAndToken();

      await request(app)
        .put('/api/salon/payment-settings')
        .set(authHeader(token))
        .send({
          razorpayKeyId: 'rzp_test_key',
          razorpayKeySecret: 'rzp_test_secret_value',
        });

      // Fetch with select to verify encryption
      const updated = await Salon.findById(salon._id).select('+payment.razorpayKeySecret');
      expect(updated.payment.razorpayKeyId).toBe('rzp_test_key');
      // The secret should be encrypted (contains colons from iv:authTag:ciphertext format)
      expect(updated.payment.razorpayKeySecret).toContain(':');
      expect(updated.payment.razorpayKeySecret).not.toBe('rzp_test_secret_value');
    });

    it('should not expose razorpayKeySecret in JSON response', async () => {
      const { token } = await createSalonAndToken();

      const res = await request(app)
        .put('/api/salon/payment-settings')
        .set(authHeader(token))
        .send({ isPaymentEnabled: true });

      expect(res.body.data.salon.payment).toBeDefined();
      expect(res.body.data.salon.payment.razorpayKeySecret).toBeUndefined();
    });

    it('should reject invalid payment mode', async () => {
      const { token } = await createSalonAndToken();

      const res = await request(app)
        .put('/api/salon/payment-settings')
        .set(authHeader(token))
        .send({ paymentMode: 'invalid' });

      expect(res.status).toBe(400);
    });
  });
});
