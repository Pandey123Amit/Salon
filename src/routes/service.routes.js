const router = require('express').Router();
const {
  listServices,
  createService,
  updateService,
  deleteService,
} = require('../controllers/service.controller');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { createServiceRules, updateServiceRules } = require('../validators/service.validator');

router.use(protect);

router.route('/')
  .get(listServices)
  .post(validate(createServiceRules), createService);

router.route('/:id')
  .put(validate(updateServiceRules), updateService)
  .delete(deleteService);

module.exports = router;
