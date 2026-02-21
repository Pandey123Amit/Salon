const ApiError = require('../utils/ApiError');
const logger = require('../utils/logger');
const env = require('../config/env');

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  let error = err;

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    error = ApiError.badRequest(`Invalid ${err.path}: ${err.value}`);
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    error = ApiError.badRequest(`${field} already exists`);
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map((e) => e.message);
    error = ApiError.badRequest('Validation failed', errors);
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    error = ApiError.unauthorized('Invalid token');
  }
  if (err.name === 'TokenExpiredError') {
    error = ApiError.unauthorized('Token expired');
  }

  const statusCode = error.statusCode || 500;
  const message = error.message || 'Internal server error';

  if (statusCode === 500) {
    logger.error('Unhandled error:', { message: err.message, stack: err.stack });
  }

  res.status(statusCode).json({
    success: false,
    message,
    errors: error.errors || [],
    ...(env.isDev && { stack: err.stack }),
  });
};

module.exports = errorHandler;
