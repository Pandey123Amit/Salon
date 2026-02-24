const { body } = require('express-validator');
const { DAYS_OF_WEEK, GENDER_OPTIONS, SLOT_DURATIONS, PAYMENT_MODES } = require('../config/constants');

const updateProfileRules = [
  body('name')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('Name cannot exceed 100 characters'),
  body('description')
    .optional()
    .isLength({ max: 500 }).withMessage('Description cannot exceed 500 characters'),
  body('gender')
    .optional()
    .isIn(GENDER_OPTIONS).withMessage('Gender must be male, female, or unisex'),
  body('address.street').optional().trim(),
  body('address.city').optional().trim(),
  body('address.state').optional().trim(),
  body('address.pincode')
    .optional()
    .matches(/^\d{6}$/).withMessage('Invalid PIN code'),
  body('gstNumber').optional().trim(),
];

const updateWorkingHoursRules = [
  body('workingHours')
    .isArray({ min: 7, max: 7 }).withMessage('Must provide all 7 days'),
  body('workingHours.*.day')
    .isIn(DAYS_OF_WEEK).withMessage('Invalid day'),
  body('workingHours.*.isOpen')
    .isBoolean().withMessage('isOpen must be boolean'),
  body('workingHours.*.openTime')
    .matches(/^([01]\d|2[0-3]):[0-5]\d$/).withMessage('Invalid time format (HH:mm)'),
  body('workingHours.*.closeTime')
    .matches(/^([01]\d|2[0-3]):[0-5]\d$/).withMessage('Invalid time format (HH:mm)'),
];

const updateSettingsRules = [
  body('slotDuration')
    .optional()
    .isIn(SLOT_DURATIONS).withMessage(`Slot duration must be one of: ${SLOT_DURATIONS.join(', ')}`),
  body('bufferTime')
    .optional()
    .isInt({ min: 0, max: 60 }).withMessage('Buffer time must be 0-60 minutes'),
  body('holidays')
    .optional()
    .isArray().withMessage('Holidays must be an array'),
  body('holidays.*')
    .optional()
    .isISO8601().withMessage('Each holiday must be a valid date'),
];

const updatePaymentSettingsRules = [
  body('razorpayKeyId')
    .optional()
    .trim()
    .notEmpty().withMessage('Razorpay Key ID cannot be empty'),
  body('razorpayKeySecret')
    .optional()
    .trim()
    .notEmpty().withMessage('Razorpay Key Secret cannot be empty'),
  body('razorpayWebhookSecret')
    .optional()
    .trim()
    .notEmpty().withMessage('Razorpay Webhook Secret cannot be empty'),
  body('isPaymentEnabled')
    .optional()
    .isBoolean().withMessage('isPaymentEnabled must be boolean'),
  body('paymentMode')
    .optional()
    .isIn(PAYMENT_MODES).withMessage(`Payment mode must be one of: ${PAYMENT_MODES.join(', ')}`),
];

const updateReminderSettingsRules = [
  body('enabled')
    .optional()
    .isBoolean().withMessage('enabled must be boolean'),
  body('schedule')
    .optional()
    .isArray().withMessage('Schedule must be an array'),
  body('schedule.*.label')
    .optional()
    .trim()
    .notEmpty().withMessage('Schedule label is required'),
  body('schedule.*.minutesBefore')
    .optional()
    .isInt({ min: 5, max: 10080 }).withMessage('minutesBefore must be between 5 and 10080'),
  body('noShowBufferMinutes')
    .optional()
    .isInt({ min: 0, max: 120 }).withMessage('No-show buffer must be 0-120 minutes'),
];

module.exports = {
  updateProfileRules,
  updateWorkingHoursRules,
  updateSettingsRules,
  updatePaymentSettingsRules,
  updateReminderSettingsRules,
};
