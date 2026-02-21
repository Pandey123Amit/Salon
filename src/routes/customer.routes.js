const router = require('express').Router();
const {
  listCustomers,
  getCustomer,
  updateCustomer,
  dueRevisit,
} = require('../controllers/customer.controller');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { updateCustomerRules, listCustomersRules } = require('../validators/customer.validator');

router.use(protect);

// Specific routes before parameterised routes
router.get('/due-revisit', dueRevisit);

router.route('/')
  .get(validate(listCustomersRules), listCustomers);

router.route('/:id')
  .get(getCustomer)
  .put(validate(updateCustomerRules), updateCustomer);

module.exports = router;
