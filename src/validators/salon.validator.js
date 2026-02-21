const { body } = require('express-validator');
const { DAYS_OF_WEEK, GENDER_OPTIONS, SLOT_DURATIONS } = require('../config/constants');

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

module.exports = { updateProfileRules, updateWorkingHoursRules, updateSettingsRules };
