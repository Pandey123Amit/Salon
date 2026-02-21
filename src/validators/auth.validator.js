const { body } = require('express-validator');
const { REGEX } = require('../config/constants');

const registerRules = [
  body('name')
    .trim()
    .notEmpty().withMessage('Salon name is required')
    .isLength({ max: 100 }).withMessage('Name cannot exceed 100 characters'),
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email format')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('phone')
    .trim()
    .notEmpty().withMessage('Phone number is required')
    .matches(REGEX.phone).withMessage('Invalid Indian mobile number'),
];

const loginRules = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email format')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('Password is required'),
];

const verifyOtpRules = [
  body('phone')
    .trim()
    .notEmpty().withMessage('Phone number is required')
    .matches(REGEX.phone).withMessage('Invalid Indian mobile number'),
  body('otp')
    .trim()
    .notEmpty().withMessage('OTP is required')
    .isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits')
    .isNumeric().withMessage('OTP must be numeric'),
];

module.exports = { registerRules, loginRules, verifyOtpRules };
