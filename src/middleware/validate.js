const { validationResult } = require('express-validator');
const ApiError = require('../utils/ApiError');

const validate = (validations) => {
  return async (req, res, next) => {
    await Promise.all(validations.map((v) => v.run(req)));

    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }

    const extracted = errors.array().map((err) => ({
      field: err.path,
      message: err.msg,
    }));

    next(ApiError.badRequest('Validation failed', extracted));
  };
};

module.exports = validate;
