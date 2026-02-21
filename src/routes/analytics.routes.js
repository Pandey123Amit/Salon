const router = require('express').Router();
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { dateRangeRules, periodRules } = require('../validators/analytics.validator');
const {
  getDashboardStats,
  getRevenueAnalytics,
  getServiceAnalytics,
  getStaffAnalytics,
  getBookingAnalytics,
  getCustomerAnalytics,
} = require('../controllers/analytics.controller');

router.use(protect);

router.get('/dashboard', getDashboardStats);
router.get('/revenue', validate(periodRules), getRevenueAnalytics);
router.get('/services', validate(dateRangeRules), getServiceAnalytics);
router.get('/staff', validate(dateRangeRules), getStaffAnalytics);
router.get('/bookings', validate(periodRules), getBookingAnalytics);
router.get('/customers', validate(periodRules), getCustomerAnalytics);

module.exports = router;
