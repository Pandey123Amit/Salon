const router = require('express').Router();
const { handleRazorpayWebhook } = require('../controllers/razorpay-webhook.controller');
const verifyRazorpayWebhookSignature = require('../middleware/razorpayWebhookSignature');

router.post('/', verifyRazorpayWebhookSignature, handleRazorpayWebhook);

module.exports = router;
