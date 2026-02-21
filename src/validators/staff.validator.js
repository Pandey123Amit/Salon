const { body } = require('express-validator');
const { DAYS_OF_WEEK, REGEX } = require('../config/constants');

const createStaffRules = [
  body('name')
    .trim()
    .notEmpty().withMessage('Staff name is required')
    .isLength({ max: 100 }).withMessage('Name cannot exceed 100 characters'),
  body('phone')
    .optional()
    .trim()
    .matches(REGEX.phone).withMessage('Invalid Indian mobile number'),
  body('role')
    .optional()
    .trim()
    .isLength({ max: 50 }).withMessage('Role cannot exceed 50 characters'),
  body('services')
    .optional()
    .isArray().withMessage('Services must be an array'),
  body('services.*')
    .optional()
    .isMongoId().withMessage('Invalid service ID'),
  body('workingHours')
    .optional()
    .isArray({ min: 7, max: 7 }).withMessage('Must provide all 7 days'),
  body('workingHours.*.day')
    .optional()
    .isIn(DAYS_OF_WEEK).withMessage('Invalid day'),
  body('workingHours.*.isAvailable')
    .optional()
    .isBoolean().withMessage('isAvailable must be boolean'),
  body('workingHours.*.startTime')
    .optional()
    .matches(/^([01]\d|2[0-3]):[0-5]\d$/).withMessage('Invalid time format (HH:mm)'),
  body('workingHours.*.endTime')
    .optional()
    .matches(/^([01]\d|2[0-3]):[0-5]\d$/).withMessage('Invalid time format (HH:mm)'),
];

const updateStaffRules = [
  body('name')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('Name cannot exceed 100 characters'),
  body('phone')
    .optional()
    .trim()
    .matches(REGEX.phone).withMessage('Invalid Indian mobile number'),
  body('role')
    .optional()
    .trim()
    .isLength({ max: 50 }).withMessage('Role cannot exceed 50 characters'),
  body('services')
    .optional()
    .isArray().withMessage('Services must be an array'),
  body('services.*')
    .optional()
    .isMongoId().withMessage('Invalid service ID'),
  body('workingHours')
    .optional()
    .isArray({ min: 7, max: 7 }).withMessage('Must provide all 7 days'),
  body('workingHours.*.day')
    .optional()
    .isIn(DAYS_OF_WEEK).withMessage('Invalid day'),
  body('workingHours.*.isAvailable')
    .optional()
    .isBoolean().withMessage('isAvailable must be boolean'),
  body('workingHours.*.startTime')
    .optional()
    .matches(/^([01]\d|2[0-3]):[0-5]\d$/).withMessage('Invalid time format (HH:mm)'),
  body('workingHours.*.endTime')
    .optional()
    .matches(/^([01]\d|2[0-3]):[0-5]\d$/).withMessage('Invalid time format (HH:mm)'),
];

module.exports = { createStaffRules, updateStaffRules };
