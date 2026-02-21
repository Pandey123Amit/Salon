const router = require('express').Router();

router.use('/auth', require('./auth.routes'));
router.use('/salon', require('./salon.routes'));
router.use('/services', require('./service.routes'));
router.use('/staff', require('./staff.routes'));
router.use('/appointments', require('./appointment.routes'));
router.use('/customers', require('./customer.routes'));

module.exports = router;
