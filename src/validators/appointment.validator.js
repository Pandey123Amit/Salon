const { body, query } = require('express-validator');
const { APPOINTMENT_STATUSES } = require('../config/constants');

const createAppointmentRules = [
  body('customerId')
    .notEmpty().withMessage('Customer ID is required')
    .isMongoId().withMessage('Invalid customer ID'),
  body('serviceId')
    .notEmpty().withMessage('Service ID is required')
    .isMongoId().withMessage('Invalid service ID'),
  body('staffId')
    .optional()
    .isMongoId().withMessage('Invalid staff ID'),
  body('date')
    .notEmpty().withMessage('Date is required')
    .isISO8601().withMessage('Date must be a valid ISO 8601 date'),
  body('startTime')
    .notEmpty().withMessage('Start time is required')
    .matches(/^([01]\d|2[0-3]):([0-5]\d)$/).withMessage('Start time must be in HH:mm format'),
  body('notes')
    .optional()
    .isLength({ max: 500 }).withMessage('Notes cannot exceed 500 characters'),
  body('bookedVia')
    .optional()
    .isIn(['whatsapp', 'dashboard', 'walkin']).withMessage('bookedVia must be whatsapp, dashboard, or walkin'),
];

const updateAppointmentRules = [
  body('status')
    .notEmpty().withMessage('Status is required')
    .isIn(APPOINTMENT_STATUSES).withMessage(`Status must be one of: ${APPOINTMENT_STATUSES.join(', ')}`),
  body('cancelReason')
    .optional()
    .isLength({ max: 500 }).withMessage('Cancel reason cannot exceed 500 characters'),
  body('notes')
    .optional()
    .isLength({ max: 500 }).withMessage('Notes cannot exceed 500 characters'),
];

const getSlotsRules = [
  query('date')
    .notEmpty().withMessage('Date is required')
    .isISO8601().withMessage('Date must be a valid ISO 8601 date'),
  query('serviceId')
    .notEmpty().withMessage('Service ID is required')
    .isMongoId().withMessage('Invalid service ID'),
  query('staffId')
    .optional()
    .isMongoId().withMessage('Invalid staff ID'),
];

const listAppointmentsRules = [
  query('date')
    .optional()
    .isISO8601().withMessage('Date must be a valid ISO 8601 date'),
  query('status')
    .optional()
    .isIn(APPOINTMENT_STATUSES).withMessage(`Status must be one of: ${APPOINTMENT_STATUSES.join(', ')}`),
  query('staffId')
    .optional()
    .isMongoId().withMessage('Invalid staff ID'),
];

module.exports = {
  createAppointmentRules,
  updateAppointmentRules,
  getSlotsRules,
  listAppointmentsRules,
};
