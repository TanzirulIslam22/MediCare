const { fail } = require('../utils/ApiResponse');
const { env } = require('../config');

// eslint-disable-next-line no-unused-vars
function notFoundHandler(req, res, next) {
  return fail(res, {
    message: `Route not found: ${req.method} ${req.originalUrl}`,
    statusCode: 404,
    errorCode: 'NOT_FOUND',
  });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err.name === 'ValidationError') {
    const details = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
    return fail(res, {
      message: 'Mongoose validation failed',
      statusCode: 422,
      errorCode: 'VALIDATION_ERROR',
      details,
    });
  }
  if (err.name === 'CastError') {
    return fail(res, {
      message: `Invalid id format for ${err.path}`,
      statusCode: 400,
      errorCode: 'INVALID_ID',
    });
  }
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || 'field';
    return fail(res, {
      message: `Duplicate value for ${field}`,
      statusCode: 409,
      errorCode: 'DUPLICATE_ENTRY',
    });
  }
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return fail(res, {
      message: 'Invalid or expired token',
      statusCode: 401,
      errorCode: 'UNAUTHORIZED',
    });
  }

  const statusCode = err.statusCode || 500;
  if (statusCode >= 500) {
    // eslint-disable-next-line no-console
    console.error('[ErrorHandler]', err);
  }
  const body = {
    success: false,
    message: err.message || 'Something went wrong',
    errorCode: err.errorCode || 'INTERNAL_ERROR',
  };
  if (err.details) body.details = err.details;
  if (statusCode >= 500 && env.NODE_ENV === 'development') body.stack = err.stack;
  return res.status(statusCode).json(body);
}

module.exports = { notFoundHandler, errorHandler };
