const router = require('express').Router();
const {
  listStaff,
  createStaff,
  updateStaff,
  deleteStaff,
} = require('../controllers/staff.controller');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { createStaffRules, updateStaffRules } = require('../validators/staff.validator');

router.use(protect);

router.route('/')
  .get(listStaff)
  .post(validate(createStaffRules), createStaff);

router.route('/:id')
  .put(validate(updateStaffRules), updateStaff)
  .delete(deleteStaff);

module.exports = router;
