const { body, param } = require('express-validator');

const createPaymentLinkRules = [
  body('appointmentId')
    .notEmpty().withMessage('Appointment ID is required')
    .isMongoId().withMessage('Invalid appointment ID'),
];

const createOrderRules = [
  body('appointmentId')
    .notEmpty().withMessage('Appointment ID is required')
    .isMongoId().withMessage('Invalid appointment ID'),
];

const verifyPaymentRules = [
  body('orderId')
    .notEmpty().withMessage('Order ID is required'),
  body('paymentId')
    .notEmpty().withMessage('Payment ID is required'),
  body('signature')
    .notEmpty().withMessage('Signature is required'),
];

const refundPaymentRules = [
  param('paymentId')
    .isMongoId().withMessage('Invalid payment ID'),
  body('amount')
    .optional()
    .isInt({ min: 100 }).withMessage('Amount must be at least 100 paise (₹1)'),
  body('reason')
    .optional()
    .trim()
    .isLength({ max: 200 }).withMessage('Reason cannot exceed 200 characters'),
];

module.exports = {
  createPaymentLinkRules,
  createOrderRules,
  verifyPaymentRules,
  refundPaymentRules,
};
