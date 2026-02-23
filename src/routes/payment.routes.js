const router = require('express').Router();
const {
  createPaymentLink,
  createOrder,
  verifyPayment,
  listPayments,
  getPaymentByAppointment,
  refundPayment,
} = require('../controllers/payment.controller');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  createPaymentLinkRules,
  createOrderRules,
  verifyPaymentRules,
  refundPaymentRules,
} = require('../validators/payment.validator');

router.use(protect);

router.post('/link', validate(createPaymentLinkRules), createPaymentLink);
router.post('/order', validate(createOrderRules), createOrder);
router.post('/verify', validate(verifyPaymentRules), verifyPayment);
router.get('/', listPayments);
router.get('/appointment/:id', getPaymentByAppointment);
router.post('/:paymentId/refund', validate(refundPaymentRules), refundPayment);

module.exports = router;
