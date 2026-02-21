const { body } = require('express-validator');
const { SERVICE_CATEGORIES, GENDER_OPTIONS } = require('../config/constants');

const createServiceRules = [
  body('name')
    .trim()
    .notEmpty().withMessage('Service name is required')
    .isLength({ max: 100 }).withMessage('Name cannot exceed 100 characters'),
  body('category')
    .notEmpty().withMessage('Category is required')
    .isIn(SERVICE_CATEGORIES).withMessage(`Category must be one of: ${SERVICE_CATEGORIES.join(', ')}`),
  body('duration')
    .notEmpty().withMessage('Duration is required')
    .isInt({ min: 5, max: 480 }).withMessage('Duration must be 5-480 minutes'),
  body('price')
    .notEmpty().withMessage('Price is required')
    .isFloat({ min: 0 }).withMessage('Price cannot be negative'),
  body('description')
    .optional()
    .isLength({ max: 500 }).withMessage('Description cannot exceed 500 characters'),
  body('gender')
    .optional()
    .isIn(GENDER_OPTIONS).withMessage('Gender must be male, female, or unisex'),
];

const updateServiceRules = [
  body('name')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('Name cannot exceed 100 characters'),
  body('category')
    .optional()
    .isIn(SERVICE_CATEGORIES).withMessage(`Category must be one of: ${SERVICE_CATEGORIES.join(', ')}`),
  body('duration')
    .optional()
    .isInt({ min: 5, max: 480 }).withMessage('Duration must be 5-480 minutes'),
  body('price')
    .optional()
    .isFloat({ min: 0 }).withMessage('Price cannot be negative'),
  body('description')
    .optional()
    .isLength({ max: 500 }).withMessage('Description cannot exceed 500 characters'),
  body('gender')
    .optional()
    .isIn(GENDER_OPTIONS).withMessage('Gender must be male, female, or unisex'),
];

module.exports = { createServiceRules, updateServiceRules };
