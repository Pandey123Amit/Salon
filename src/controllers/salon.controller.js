const { Salon } = require('../models');
const { encryptToken } = require('../services/whatsapp-crypto.service');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');

// @desc    Get salon profile
// @route   GET /api/salon/profile
const getProfile = asyncHandler(async (req, res) => {
  res.json(ApiResponse.success('Salon profile', { salon: req.salon }));
});

// @desc    Update salon profile
// @route   PUT /api/salon/profile
const updateProfile = asyncHandler(async (req, res) => {
  const allowedFields = ['name', 'description', 'gender', 'address', 'gstNumber'];
  const updates = {};

  for (const field of allowedFields) {
    if (req.body[field] !== undefined) {
      updates[field] = req.body[field];
    }
  }

  const salon = await Salon.findByIdAndUpdate(req.salon._id, updates, {
    new: true,
    runValidators: true,
  });

  res.json(ApiResponse.success('Profile updated', { salon }));
});

// @desc    Update working hours
// @route   PUT /api/salon/working-hours
const updateWorkingHours = asyncHandler(async (req, res) => {
  const salon = await Salon.findByIdAndUpdate(
    req.salon._id,
    { workingHours: req.body.workingHours },
    { new: true, runValidators: true }
  );

  res.json(ApiResponse.success('Working hours updated', { salon }));
});

// @desc    Update settings (slot duration, buffer, holidays)
// @route   PUT /api/salon/settings
const updateSettings = asyncHandler(async (req, res) => {
  const allowedFields = ['slotDuration', 'bufferTime', 'holidays'];
  const updates = {};

  for (const field of allowedFields) {
    if (req.body[field] !== undefined) {
      updates[field] = req.body[field];
    }
  }

  const salon = await Salon.findByIdAndUpdate(req.salon._id, updates, {
    new: true,
    runValidators: true,
  });

  res.json(ApiResponse.success('Settings updated', { salon }));
});

// @desc    Update payment settings
// @route   PUT /api/salon/payment-settings
const updatePaymentSettings = asyncHandler(async (req, res) => {
  const updates = {};

  if (req.body.razorpayKeyId !== undefined) {
    updates['payment.razorpayKeyId'] = req.body.razorpayKeyId;
  }
  if (req.body.razorpayKeySecret !== undefined) {
    updates['payment.razorpayKeySecret'] = encryptToken(req.body.razorpayKeySecret);
  }
  if (req.body.razorpayWebhookSecret !== undefined) {
    updates['payment.razorpayWebhookSecret'] = encryptToken(req.body.razorpayWebhookSecret);
  }
  if (req.body.isPaymentEnabled !== undefined) {
    updates['payment.isPaymentEnabled'] = req.body.isPaymentEnabled;
  }
  if (req.body.paymentMode !== undefined) {
    updates['payment.paymentMode'] = req.body.paymentMode;
  }

  const salon = await Salon.findByIdAndUpdate(req.salon._id, updates, {
    new: true,
    runValidators: true,
  });

  res.json(ApiResponse.success('Payment settings updated', { salon }));
});

// @desc    Update reminder settings
// @route   PUT /api/salon/reminder-settings
const updateReminderSettings = asyncHandler(async (req, res) => {
  const updates = {};

  if (req.body.enabled !== undefined) {
    updates['reminders.enabled'] = req.body.enabled;
  }
  if (req.body.schedule !== undefined) {
    updates['reminders.schedule'] = req.body.schedule;
  }
  if (req.body.noShowBufferMinutes !== undefined) {
    updates.noShowBufferMinutes = req.body.noShowBufferMinutes;
  }

  const salon = await Salon.findByIdAndUpdate(req.salon._id, updates, {
    new: true,
    runValidators: true,
  });

  res.json(ApiResponse.success('Reminder settings updated', { salon }));
});

module.exports = {
  getProfile,
  updateProfile,
  updateWorkingHours,
  updateSettings,
  updatePaymentSettings,
  updateReminderSettings,
};
