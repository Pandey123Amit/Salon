const router = require('express').Router();
const {
  listAppointments,
  todayAppointments,
  createAppointment,
  updateAppointment,
  getSlots,
} = require('../controllers/appointment.controller');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  createAppointmentRules,
  updateAppointmentRules,
  getSlotsRules,
  listAppointmentsRules,
} = require('../validators/appointment.validator');

router.use(protect);

// Specific routes before parameterised routes
router.get('/today', todayAppointments);
router.get('/slots', validate(getSlotsRules), getSlots);

router.route('/')
  .get(validate(listAppointmentsRules), listAppointments)
  .post(validate(createAppointmentRules), createAppointment);

router.route('/:id')
  .put(validate(updateAppointmentRules), updateAppointment);

module.exports = router;
