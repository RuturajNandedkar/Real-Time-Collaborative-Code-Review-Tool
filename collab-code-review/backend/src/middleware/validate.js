const { validationResult } = require('express-validator');
const AppError = require('../utils/AppError');

/**
 * Middleware: Validate request using express-validator rules.
 * Must be used after validation rule arrays in routes.
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const messages = errors
      .array()
      .map((e) => `${e.path}: ${e.msg}`)
      .join('; ');
    return next(new AppError(messages, 422));
  }
  next();
};

module.exports = validate;
