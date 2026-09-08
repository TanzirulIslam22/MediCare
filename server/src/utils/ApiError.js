class ApiError extends Error {
  constructor(message, statusCode, errorCode = 'INTERNAL_ERROR', details) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message = 'Bad request', errorCode = 'BAD_REQUEST', details) {
    return new ApiError(message, 400, errorCode, details);
  }

  static unauthorized(message = 'Authentication required', errorCode = 'UNAUTHORIZED') {
    return new ApiError(message, 401, errorCode);
  }

  static forbidden(message = 'You do not have permission', errorCode = 'FORBIDDEN') {
    return new ApiError(message, 403, errorCode);
  }

  static notFound(message = 'Resource not found', errorCode = 'NOT_FOUND') {
    return new ApiError(message, 404, errorCode);
  }

  static conflict(message = 'Conflict', errorCode = 'CONFLICT') {
    return new ApiError(message, 409, errorCode);
  }

  static validation(message = 'Validation failed', errorCode = 'VALIDATION_ERROR', details) {
    return new ApiError(message, 422, errorCode, details);
  }
}

module.exports = ApiError;
