const { Appointment, Customer, Payment, Salon } = require('../models');
const paymentService = require('../services/payment.service');
const { decryptToken } = require('../services/whatsapp-crypto.service');
const env = require('../config/env');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

// @desc    Create payment link (WhatsApp flow)
// @route   POST /api/payments/link
const createPaymentLink = asyncHandler(async (req, res) => {
  const { appointmentId } = req.body;
  const salon = await Salon.findById(req.salon._id).select('+payment.razorpayKeySecret');

  const appointment = await Appointment.findOne({
    _id: appointmentId,
    salonId: salon._id,
  });
  if (!appointment) throw ApiError.notFound('Appointment not found');

  const customer = await Customer.findById(appointment.customerId);
  if (!customer) throw ApiError.notFound('Customer not found');

  const result = await paymentService.createPaymentLink({ salon, appointment, customer });
  res.status(201).json(ApiResponse.created('Payment link created', result));
});

// @desc    Create Razorpay order (dashboard checkout)
// @route   POST /api/payments/order
const createOrder = asyncHandler(async (req, res) => {
  const { appointmentId } = req.body;
  const salon = await Salon.findById(req.salon._id).select('+payment.razorpayKeySecret');

  const appointment = await Appointment.findOne({
    _id: appointmentId,
    salonId: salon._id,
  });
  if (!appointment) throw ApiError.notFound('Appointment not found');

  const customer = await Customer.findById(appointment.customerId);
  if (!customer) throw ApiError.notFound('Customer not found');

  const result = await paymentService.createOrder({ salon, appointment, customer });
  res.status(201).json(ApiResponse.created('Order created', result));
});

// @desc    Verify payment signature (dashboard callback)
// @route   POST /api/payments/verify
const verifyPayment = asyncHandler(async (req, res) => {
  const { orderId, paymentId, signature } = req.body;
  const salon = await Salon.findById(req.salon._id).select('+payment.razorpayKeySecret');

  // Determine which secret to use
  let secret = env.razorpayKeySecret;
  if (salon?.payment?.razorpayKeySecret) {
    secret = decryptToken(salon.payment.razorpayKeySecret);
  }

  const isValid = paymentService.verifyPaymentSignature(
    { orderId, paymentId, signature },
    secret
  );

  if (!isValid) {
    throw ApiError.badRequest('Invalid payment signature');
  }

  // Update payment record
  const payment = await Payment.findOne({ razorpayOrderId: orderId, salonId: salon._id });
  if (payment) {
    payment.status = 'paid';
    payment.razorpayPaymentId = paymentId;
    payment.razorpaySignature = signature;
    payment.paidAt = new Date();
    await payment.save();

    await Appointment.findByIdAndUpdate(payment.appointmentId, {
      'payment.status': 'paid',
      'payment.razorpayPaymentId': paymentId,
      'payment.paidAt': new Date(),
    });
  }

  res.json(ApiResponse.success('Payment verified', { verified: true }));
});

// @desc    List salon payments
// @route   GET /api/payments
const listPayments = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status } = req.query;
  const filter = { salonId: req.salon._id };
  if (status) filter.status = status;

  const payments = await Payment.find(filter)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(parseInt(limit))
    .populate('appointmentId', 'date startTime endTime')
    .populate('customerId', 'name phone');

  const total = await Payment.countDocuments(filter);

  res.json(ApiResponse.success('Payments', {
    payments,
    pagination: { page: parseInt(page), limit: parseInt(limit), total },
  }));
});

// @desc    Get payment for a specific appointment
// @route   GET /api/payments/appointment/:id
const getPaymentByAppointment = asyncHandler(async (req, res) => {
  const payment = await paymentService.getPaymentByAppointment(req.params.id);

  if (!payment) throw ApiError.notFound('Payment not found for this appointment');
  if (payment.salonId.toString() !== req.salon._id.toString()) {
    throw ApiError.notFound('Payment not found for this appointment');
  }

  res.json(ApiResponse.success('Payment', { payment }));
});

// @desc    Initiate refund
// @route   POST /api/payments/:paymentId/refund
const refundPayment = asyncHandler(async (req, res) => {
  const salon = await Salon.findById(req.salon._id).select('+payment.razorpayKeySecret');

  // Verify payment belongs to salon
  const payment = await Payment.findById(req.params.paymentId);
  if (!payment || payment.salonId.toString() !== salon._id.toString()) {
    throw ApiError.notFound('Payment not found');
  }

  const result = await paymentService.initiateRefund({
    salon,
    paymentId: req.params.paymentId,
    amount: req.body.amount,
    reason: req.body.reason,
  });

  res.json(ApiResponse.success('Refund initiated', result));
});

module.exports = {
  createPaymentLink,
  createOrder,
  verifyPayment,
  listPayments,
  getPaymentByAppointment,
  refundPayment,
};
