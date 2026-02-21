const { query } = require('express-validator');

const dateRangeRules = [
  query('startDate')
    .optional()
    .isISO8601().withMessage('startDate must be a valid ISO 8601 date'),
  query('endDate')
    .optional()
    .isISO8601().withMessage('endDate must be a valid ISO 8601 date'),
];

const periodRules = [
  ...dateRangeRules,
  query('period')
    .optional()
    .isIn(['daily', 'weekly', 'monthly']).withMessage('period must be daily, weekly, or monthly'),
];

module.exports = {
  dateRangeRules,
  periodRules,
};
