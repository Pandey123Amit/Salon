const { Service } = require('../models');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');

// @desc    List services for salon
// @route   GET /api/services
const listServices = asyncHandler(async (req, res) => {
  const services = await Service.find({
    salonId: req.salon._id,
    isActive: true,
  }).sort('category name');

  res.json(ApiResponse.success('Services list', { services }));
});

// @desc    Create service
// @route   POST /api/services
const createService = asyncHandler(async (req, res) => {
  const service = await Service.create({
    ...req.body,
    salonId: req.salon._id,
  });

  res.status(201).json(ApiResponse.created('Service created', { service }));
});

// @desc    Update service
// @route   PUT /api/services/:id
const updateService = asyncHandler(async (req, res) => {
  const service = await Service.findOneAndUpdate(
    { _id: req.params.id, salonId: req.salon._id, isActive: true },
    req.body,
    { new: true, runValidators: true }
  );

  if (!service) {
    throw ApiError.notFound('Service not found');
  }

  res.json(ApiResponse.success('Service updated', { service }));
});

// @desc    Soft-delete service
// @route   DELETE /api/services/:id
const deleteService = asyncHandler(async (req, res) => {
  const service = await Service.findOneAndUpdate(
    { _id: req.params.id, salonId: req.salon._id, isActive: true },
    { isActive: false },
    { new: true }
  );

  if (!service) {
    throw ApiError.notFound('Service not found');
  }

  res.json(ApiResponse.success('Service deleted'));
});

module.exports = { listServices, createService, updateService, deleteService };
