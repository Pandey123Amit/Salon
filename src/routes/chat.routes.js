const router = require('express').Router();
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { sendMessageRules, getHistoryRules } = require('../validators/chat.validator');
const { sendMessage, getHistory } = require('../controllers/chat.controller');

router.use(protect);

router.post('/message', validate(sendMessageRules), sendMessage);
router.get('/history', validate(getHistoryRules), getHistory);

module.exports = router;
