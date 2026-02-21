const { body, query } = require('express-validator');
const { REGEX } = require('../config/constants');

const sendMessageRules = [
  body('phone')
    .trim()
    .matches(REGEX.phone)
    .withMessage('Valid 10-digit Indian mobile number required'),
  body('message')
    .trim()
    .notEmpty()
    .withMessage('Message is required')
    .isLength({ max: 1000 })
    .withMessage('Message cannot exceed 1000 characters'),
];

const getHistoryRules = [
  query('phone')
    .trim()
    .matches(REGEX.phone)
    .withMessage('Valid 10-digit Indian mobile number required'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
    .toInt(),
];

module.exports = { sendMessageRules, getHistoryRules };
