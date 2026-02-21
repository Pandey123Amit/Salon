const { Customer, Appointment } = require('../models');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');

// @desc    List customers (with optional search)
// @route   GET /api/customers
const listCustomers = asyncHandler(async (req, res) => {
  const filter = { salonId: req.salon._id, isActive: true };

  if (req.query.search) {
    const search = req.query.search.trim();
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { phone: { $regex: search } },
    ];
  }

  const customers = await Customer.find(filter).sort('-updatedAt');

  res.json(ApiResponse.success('Customers list', { customers }));
});

// @desc    Get single customer with appointment history
// @route   GET /api/customers/:id
const getCustomer = asyncHandler(async (req, res) => {
  const customer = await Customer.findOne({
    _id: req.params.id,
    salonId: req.salon._id,
    isActive: true,
  });

  if (!customer) throw ApiError.notFound('Customer not found');

  const appointments = await Appointment.find({
    customerId: customer._id,
    salonId: req.salon._id,
  })
    .populate('serviceId', 'name category price')
    .populate('staffId', 'name')
    .sort('-date -startTime');

  res.json(ApiResponse.success('Customer details', { customer, appointments }));
});

// @desc    Update customer info
// @route   PUT /api/customers/:id
const updateCustomer = asyncHandler(async (req, res) => {
  const customer = await Customer.findOneAndUpdate(
    { _id: req.params.id, salonId: req.salon._id, isActive: true },
    req.body,
    { new: true, runValidators: true }
  );

  if (!customer) throw ApiError.notFound('Customer not found');

  res.json(ApiResponse.success('Customer updated', { customer }));
});

// @desc    Customers due for revisit (lastVisit > 30 days ago)
// @route   GET /api/customers/due-revisit
const dueRevisit = asyncHandler(async (req, res) => {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const customers = await Customer.find({
    salonId: req.salon._id,
    isActive: true,
    lastVisit: { $lte: thirtyDaysAgo },
  }).sort('lastVisit');

  res.json(ApiResponse.success('Customers due for revisit', { customers }));
});

module.exports = { listCustomers, getCustomer, updateCustomer, dueRevisit };
