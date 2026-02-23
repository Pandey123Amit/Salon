const router = require('express').Router();
const {
  getProfile,
  updateProfile,
  updateWorkingHours,
  updateSettings,
  updatePaymentSettings,
  updateReminderSettings,
} = require('../controllers/salon.controller');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  updateProfileRules,
  updateWorkingHoursRules,
  updateSettingsRules,
  updatePaymentSettingsRules,
  updateReminderSettingsRules,
} = require('../validators/salon.validator');

router.use(protect);

router.route('/profile')
  .get(getProfile)
  .put(validate(updateProfileRules), updateProfile);

router.put('/working-hours', validate(updateWorkingHoursRules), updateWorkingHours);
router.put('/settings', validate(updateSettingsRules), updateSettings);
router.put('/payment-settings', validate(updatePaymentSettingsRules), updatePaymentSettings);
router.put('/reminder-settings', validate(updateReminderSettingsRules), updateReminderSettings);

module.exports = router;
