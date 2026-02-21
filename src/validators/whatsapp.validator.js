const { body } = require('express-validator');

const connectWhatsAppRules = [
  body('phoneNumberId')
    .trim()
    .notEmpty()
    .withMessage('Phone number ID is required')
    .isString(),
  body('accessToken')
    .trim()
    .notEmpty()
    .withMessage('Access token is required')
    .isString()
    .isLength({ min: 10 })
    .withMessage('Access token seems too short'),
];

module.exports = { connectWhatsAppRules };
