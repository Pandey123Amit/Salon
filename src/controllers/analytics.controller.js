const { Appointment, Customer, Staff, Service } = require('../models');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Build a date-grouping expression for aggregation based on period.
 */
function getDateGroupExpression(period) {
  switch (period) {
    case 'weekly':
      return { $dateToString: { format: '%Y-W%V', date: '$date' } };
    case 'monthly':
      return { $dateToString: { format: '%Y-%m', date: '$date' } };
    default: // daily
      return { $dateToString: { format: '%Y-%m-%d', date: '$date' } };
  }
}

/**
 * Parse date range from query, defaulting to last 30 days.
 */
function parseDateRange(query) {
  const endDate = query.endDate ? new Date(query.endDate) : new Date();
  endDate.setHours(23, 59, 59, 999);

  const startDate = query.startDate
    ? new Date(query.startDate)
    : new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
  startDate.setHours(0, 0, 0, 0);

  return { startDate, endDate };
}

// @desc    Dashboard summary stats
// @route   GET /api/analytics/dashboard
const getDashboardStats = asyncHandler(async (req, res) => {
  const salonId = req.salon._id;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayEnd = new Date(today);
  todayEnd.setHours(23, 59, 59, 999);

  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  const [todayStats, todayRevenue, monthRevenue, totalCustomers, totalStaff] =
    await Promise.all([
      // Today's appointments grouped by status
      Appointment.aggregate([
        { $match: { salonId, date: { $gte: today, $lte: todayEnd } } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      // Today's revenue (completed appointments)
      Appointment.aggregate([
        {
          $match: {
            salonId,
            date: { $gte: today, $lte: todayEnd },
            status: 'completed',
          },
        },
        { $group: { _id: null, total: { $sum: '$price' } } },
      ]),
      // Month's revenue (completed appointments)
      Appointment.aggregate([
        {
          $match: {
            salonId,
            date: { $gte: monthStart, $lte: todayEnd },
            status: 'completed',
          },
        },
        { $group: { _id: null, total: { $sum: '$price' } } },
      ]),
      Customer.countDocuments({ salonId, isActive: true }),
      Staff.countDocuments({ salonId, isActive: true }),
    ]);

  // Convert status array to object
  const appointmentsByStatus = {};
  let todayTotal = 0;
  todayStats.forEach(({ _id, count }) => {
    appointmentsByStatus[_id] = count;
    todayTotal += count;
  });

  res.json(
    ApiResponse.success('Dashboard stats', {
      todayAppointments: todayTotal,
      appointmentsByStatus,
      todayRevenue: todayRevenue[0]?.total || 0,
      monthRevenue: monthRevenue[0]?.total || 0,
      totalCustomers,
      totalStaff,
    })
  );
});

// @desc    Revenue over time
// @route   GET /api/analytics/revenue
const getRevenueAnalytics = asyncHandler(async (req, res) => {
  const salonId = req.salon._id;
  const { startDate, endDate } = parseDateRange(req.query);
  const period = req.query.period || 'daily';

  const revenue = await Appointment.aggregate([
    {
      $match: {
        salonId,
        status: 'completed',
        date: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $group: {
        _id: getDateGroupExpression(period),
        revenue: { $sum: '$price' },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
    { $project: { _id: 0, date: '$_id', revenue: 1, count: 1 } },
  ]);

  res.json(ApiResponse.success('Revenue analytics', { revenue }));
});

// @desc    Service popularity
// @route   GET /api/analytics/services
const getServiceAnalytics = asyncHandler(async (req, res) => {
  const salonId = req.salon._id;
  const { startDate, endDate } = parseDateRange(req.query);

  const services = await Appointment.aggregate([
    {
      $match: {
        salonId,
        date: { $gte: startDate, $lte: endDate },
        status: { $nin: ['cancelled', 'no-show'] },
      },
    },
    {
      $group: {
        _id: '$serviceId',
        count: { $sum: 1 },
        revenue: { $sum: '$price' },
      },
    },
    {
      $lookup: {
        from: 'services',
        localField: '_id',
        foreignField: '_id',
        as: 'service',
      },
    },
    { $unwind: '$service' },
    {
      $project: {
        _id: 0,
        serviceId: '$_id',
        name: '$service.name',
        category: '$service.category',
        count: 1,
        revenue: 1,
      },
    },
    { $sort: { count: -1 } },
  ]);

  res.json(ApiResponse.success('Service analytics', { services }));
});

// @desc    Staff performance
// @route   GET /api/analytics/staff
const getStaffAnalytics = asyncHandler(async (req, res) => {
  const salonId = req.salon._id;
  const { startDate, endDate } = parseDateRange(req.query);

  const staff = await Appointment.aggregate([
    {
      $match: {
        salonId,
        status: 'completed',
        date: { $gte: startDate, $lte: endDate },
        staffId: { $ne: null },
      },
    },
    {
      $group: {
        _id: '$staffId',
        appointments: { $sum: 1 },
        revenue: { $sum: '$price' },
      },
    },
    {
      $lookup: {
        from: 'staff',
        localField: '_id',
        foreignField: '_id',
        as: 'staffMember',
      },
    },
    { $unwind: '$staffMember' },
    {
      $project: {
        _id: 0,
        staffId: '$_id',
        name: '$staffMember.name',
        appointments: 1,
        revenue: 1,
      },
    },
    { $sort: { revenue: -1 } },
  ]);

  res.json(ApiResponse.success('Staff analytics', { staff }));
});

// @desc    Booking trends by channel
// @route   GET /api/analytics/bookings
const getBookingAnalytics = asyncHandler(async (req, res) => {
  const salonId = req.salon._id;
  const { startDate, endDate } = parseDateRange(req.query);
  const period = req.query.period || 'daily';

  const bookings = await Appointment.aggregate([
    {
      $match: {
        salonId,
        date: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $group: {
        _id: {
          date: getDateGroupExpression(period),
          channel: '$bookedVia',
        },
        count: { $sum: 1 },
      },
    },
    { $sort: { '_id.date': 1 } },
  ]);

  // Pivot: group by date with channels as keys
  const dateMap = {};
  bookings.forEach(({ _id, count }) => {
    if (!dateMap[_id.date]) {
      dateMap[_id.date] = { date: _id.date, whatsapp: 0, dashboard: 0, walkin: 0 };
    }
    dateMap[_id.date][_id.channel] = count;
  });

  res.json(
    ApiResponse.success('Booking analytics', {
      bookings: Object.values(dateMap),
    })
  );
});

// @desc    Customer growth
// @route   GET /api/analytics/customers
const getCustomerAnalytics = asyncHandler(async (req, res) => {
  const salonId = req.salon._id;
  const { startDate, endDate } = parseDateRange(req.query);
  const period = req.query.period || 'daily';

  let dateFormat;
  switch (period) {
    case 'weekly':
      dateFormat = '%Y-W%V';
      break;
    case 'monthly':
      dateFormat = '%Y-%m';
      break;
    default:
      dateFormat = '%Y-%m-%d';
  }

  const customers = await Customer.aggregate([
    {
      $match: {
        salonId,
        createdAt: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $group: {
        _id: { $dateToString: { format: dateFormat, date: '$createdAt' } },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
    { $project: { _id: 0, date: '$_id', count: 1 } },
  ]);

  res.json(ApiResponse.success('Customer analytics', { customers }));
});

module.exports = {
  getDashboardStats,
  getRevenueAnalytics,
  getServiceAnalytics,
  getStaffAnalytics,
  getBookingAnalytics,
  getCustomerAnalytics,
};
