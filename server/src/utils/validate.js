const { z } = require('zod');
const ApiError = require('./ApiError');

function validate(schema, source = 'body') {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const details = result.error.issues.map((i) => ({
        field: i.path.join('.'),
        message: i.message,
      }));
      return next(ApiError.validation('Validation failed', details));
    }
    req[source] = result.data;
    return next();
  };
}

module.exports = { validate };
