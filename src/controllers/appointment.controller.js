const { Appointment, Customer, Service, Staff } = require('../models');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');
const { getAvailableSlots, timeToMinutes, minutesToTime } = require('../services/slot.service');

// Valid status transitions
const STATUS_TRANSITIONS = {
  pending: ['confirmed', 'cancelled', 'no-show'],
  confirmed: ['in-progress', 'cancelled', 'no-show'],
  'in-progress': ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
  'no-show': [],
};

// @desc    List appointments (with optional filters)
// @route   GET /api/appointments
const listAppointments = asyncHandler(async (req, res) => {
  const filter = { salonId: req.salon._id };

  if (req.query.date) {
    const day = new Date(req.query.date);
    day.setHours(0, 0, 0, 0);
    const dayEnd = new Date(day);
    dayEnd.setHours(23, 59, 59, 999);
    filter.date = { $gte: day, $lte: dayEnd };
  }

  if (req.query.status) {
    filter.status = req.query.status;
  }

  if (req.query.staffId) {
    filter.staffId = req.query.staffId;
  }

  const appointments = await Appointment.find(filter)
    .populate('customerId', 'name phone')
    .populate('serviceId', 'name category duration price')
    .populate('staffId', 'name')
    .sort('date startTime');

  res.json(ApiResponse.success('Appointments list', { appointments }));
});

// @desc    Today's appointments
// @route   GET /api/appointments/today
const todayAppointments = asyncHandler(async (req, res) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayEnd = new Date(today);
  todayEnd.setHours(23, 59, 59, 999);

  const appointments = await Appointment.find({
    salonId: req.salon._id,
    date: { $gte: today, $lte: todayEnd },
  })
    .populate('customerId', 'name phone')
    .populate('serviceId', 'name category duration price')
    .populate('staffId', 'name')
    .sort('startTime');

  res.json(ApiResponse.success("Today's appointments", { appointments }));
});

// @desc    Create appointment
// @route   POST /api/appointments
const createAppointment = asyncHandler(async (req, res) => {
  const salonId = req.salon._id;
  const { customerId, serviceId, staffId, date, startTime, notes, bookedVia } = req.body;

  // Validate customer belongs to salon
  const customer = await Customer.findOne({ _id: customerId, salonId, isActive: true });
  if (!customer) throw ApiError.notFound('Customer not found');

  // Validate service belongs to salon
  const service = await Service.findOne({ _id: serviceId, salonId, isActive: true });
  if (!service) throw ApiError.notFound('Service not found');

  // Compute endTime and price from service
  const startMinutes = timeToMinutes(startTime);
  const endTime = minutesToTime(startMinutes + service.duration);

  // Verify slot availability
  const { slots } = await getAvailableSlots({ salonId, date, serviceId, staffId });

  // Find a matching slot
  let assignedStaffId = staffId;
  const matchingSlot = slots.find((s) => {
    if (s.startTime !== startTime) return false;
    if (staffId) return s.staffId.toString() === staffId.toString();
    return true; // auto-assign first available
  });

  if (!matchingSlot) {
    throw ApiError.badRequest('Selected time slot is not available');
  }

  // Auto-assign staff if none provided
  if (!assignedStaffId) {
    assignedStaffId = matchingSlot.staffId;
  }

  const appointment = await Appointment.create({
    salonId,
    customerId,
    serviceId,
    staffId: assignedStaffId,
    date: new Date(date),
    startTime,
    endTime,
    duration: service.duration,
    price: service.price,
    status: 'pending',
    notes,
    bookedVia: bookedVia || 'dashboard',
  });

  const populated = await Appointment.findById(appointment._id)
    .populate('customerId', 'name phone')
    .populate('serviceId', 'name category duration price')
    .populate('staffId', 'name');

  res.status(201).json(ApiResponse.created('Appointment created', { appointment: populated }));
});

// @desc    Update appointment status
// @route   PUT /api/appointments/:id
const updateAppointment = asyncHandler(async (req, res) => {
  const appointment = await Appointment.findOne({
    _id: req.params.id,
    salonId: req.salon._id,
  });

  if (!appointment) throw ApiError.notFound('Appointment not found');

  const { status, cancelReason, notes } = req.body;

  // Enforce status transitions
  const allowed = STATUS_TRANSITIONS[appointment.status];
  if (!allowed || !allowed.includes(status)) {
    throw ApiError.badRequest(
      `Cannot transition from '${appointment.status}' to '${status}'`
    );
  }

  appointment.status = status;
  if (cancelReason) appointment.cancelReason = cancelReason;
  if (notes !== undefined) appointment.notes = notes;
  await appointment.save();

  // On completion → update customer stats
  if (status === 'completed') {
    await Customer.findByIdAndUpdate(appointment.customerId, {
      $inc: { totalVisits: 1 },
      lastVisit: new Date(),
    });
  }

  const populated = await Appointment.findById(appointment._id)
    .populate('customerId', 'name phone')
    .populate('serviceId', 'name category duration price')
    .populate('staffId', 'name');

  res.json(ApiResponse.success('Appointment updated', { appointment: populated }));
});

// @desc    Get available slots
// @route   GET /api/appointments/slots
const getSlots = asyncHandler(async (req, res) => {
  const { date, serviceId, staffId } = req.query;

  const result = await getAvailableSlots({
    salonId: req.salon._id,
    date,
    serviceId,
    staffId,
  });

  res.json(ApiResponse.success('Available slots', result));
});

module.exports = {
  listAppointments,
  todayAppointments,
  createAppointment,
  updateAppointment,
  getSlots,
};
