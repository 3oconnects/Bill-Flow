// backend/middleware/validate.js
// Zod validation middleware factory
const { sendError } = require('../utils/response');

/**
 * validate(schema) — returns Express middleware that validates req.body
 * Uses Zod's safeParse so it never throws.
 *
 * Usage:
 *   const { authSchemas } = require('../validators');
 *   router.post('/login', validate(authSchemas.login), handler);
 */
function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const errors = result.error.errors.map(e => ({
        field:   e.path.join('.'),
        message: e.message,
      }));
      return sendError(res, 'Validation failed', 'VALIDATION_ERROR', 400, { errors });
    }
    // Replace req.body with the coerced/transformed Zod output
    req.body = result.data;
    next();
  };
}

/**
 * validateQuery(schema) — same but for req.query
 */
function validateQuery(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      const errors = result.error.errors.map(e => ({
        field:   e.path.join('.'),
        message: e.message,
      }));
      return sendError(res, 'Invalid query parameters', 'VALIDATION_ERROR', 400, { errors });
    }
    req.query = result.data;
    next();
  };
}

module.exports = { validate, validateQuery };
