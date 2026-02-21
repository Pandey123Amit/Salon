const { Salon } = require('../models');
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

module.exports = { getProfile, updateProfile, updateWorkingHours, updateSettings };
