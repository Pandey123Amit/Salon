const { Staff } = require('../models');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');

// @desc    List staff for salon
// @route   GET /api/staff
const listStaff = asyncHandler(async (req, res) => {
  const staff = await Staff.find({
    salonId: req.salon._id,
    isActive: true,
  })
    .populate('services', 'name category')
    .sort('name');

  res.json(ApiResponse.success('Staff list', { staff }));
});

// @desc    Create staff member
// @route   POST /api/staff
const createStaff = asyncHandler(async (req, res) => {
  const staff = await Staff.create({
    ...req.body,
    salonId: req.salon._id,
  });

  res.status(201).json(ApiResponse.created('Staff member created', { staff }));
});

// @desc    Update staff member
// @route   PUT /api/staff/:id
const updateStaff = asyncHandler(async (req, res) => {
  const staff = await Staff.findOneAndUpdate(
    { _id: req.params.id, salonId: req.salon._id, isActive: true },
    req.body,
    { new: true, runValidators: true }
  );

  if (!staff) {
    throw ApiError.notFound('Staff member not found');
  }

  res.json(ApiResponse.success('Staff member updated', { staff }));
});

// @desc    Soft-delete staff member
// @route   DELETE /api/staff/:id
const deleteStaff = asyncHandler(async (req, res) => {
  const staff = await Staff.findOneAndUpdate(
    { _id: req.params.id, salonId: req.salon._id, isActive: true },
    { isActive: false },
    { new: true }
  );

  if (!staff) {
    throw ApiError.notFound('Staff member not found');
  }

  res.json(ApiResponse.success('Staff member deleted'));
});

module.exports = { listStaff, createStaff, updateStaff, deleteStaff };
