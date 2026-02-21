const router = require('express').Router();
const { verifyWebhook, handleWebhook } = require('../controllers/webhook.controller');
const verifyWebhookSignature = require('../middleware/webhookSignature');

// GET /webhook — Meta verification handshake (no signature check)
router.get('/', verifyWebhook);

// POST /webhook — Incoming messages & status updates
router.post('/', verifyWebhookSignature, handleWebhook);

module.exports = router;
