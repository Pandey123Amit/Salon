const jwt = require('jsonwebtoken');
const { Salon } = require('../models');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const env = require('../config/env');

const protect = asyncHandler(async (req, res, next) => {
  let token;

  if (req.headers.authorization?.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    throw ApiError.unauthorized('Not authorized, no token');
  }

  const decoded = jwt.verify(token, env.jwtSecret);
  const salon = await Salon.findById(decoded.id);

  if (!salon) {
    throw ApiError.unauthorized('Salon not found for this token');
  }

  if (!salon.isActive) {
    throw ApiError.unauthorized('Account is deactivated');
  }

  req.salon = salon;
  next();
});

module.exports = { protect };
