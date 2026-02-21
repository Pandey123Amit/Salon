const router = require('express').Router();
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { connectWhatsAppRules } = require('../validators/whatsapp.validator');
const {
  connectWhatsApp,
  disconnectWhatsApp,
  getWhatsAppStatus,
} = require('../controllers/whatsapp-onboarding.controller');

router.use(protect);

router.post('/connect', validate(connectWhatsAppRules), connectWhatsApp);
router.delete('/disconnect', disconnectWhatsApp);
router.get('/status', getWhatsAppStatus);

module.exports = router;
