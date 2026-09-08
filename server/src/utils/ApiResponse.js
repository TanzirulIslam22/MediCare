const ApiError = require('./ApiError');

function ok(res, data, message, statusCode = 200) {
  return res.status(statusCode).json({ success: true, data, message });
}

function fail(res, err) {
  const statusCode = err.statusCode || 500;
  const body = {
    success: false,
    message: err.message || 'Something went wrong',
    errorCode: err.errorCode || 'INTERNAL_ERROR',
  };
  if (err.details) body.details = err.details;
  if (statusCode >= 500) body.stack = undefined;
  return res.status(statusCode).json(body);
}

module.exports = { ok, fail };
