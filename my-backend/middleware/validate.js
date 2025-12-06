/**
 * Validation Middleware for BISMAN ERP
 * 
 * Express middleware for validating request body, query, and params
 * using Zod schemas. Returns consistent error format.
 * 
 * Usage:
 *   router.post('/customers', validateBody(customerCreateSchema), handler)
 *   router.get('/customers', validateQuery(paginationSchema), handler)
 *   router.get('/customers/:id', validateParams(z.object({ id: uuidSchema })), handler)
 */

const { ZodSchema, ZodError } = require('zod');

/**
 * Map Zod error to our standard FieldError format
 */
function mapZodErrors(error) {
  return error.issues.map((issue) => {
    const field = issue.path.join('.');
    
    // Map Zod error codes to our codes
    let code = 'INVALID_FORMAT';
    const meta = {};
    
    switch (issue.code) {
      case 'invalid_type':
        code = 'INVALID_TYPE';
        meta.expected = issue.expected;
        meta.received = issue.received;
        break;
      case 'too_small':
        code = issue.type === 'string' ? 'TOO_SHORT' : 'TOO_SMALL';
        meta.minimum = issue.minimum;
        break;
      case 'too_big':
        code = issue.type === 'string' ? 'TOO_LONG' : 'TOO_BIG';
        meta.maximum = issue.maximum;
        break;
      case 'invalid_enum_value':
        code = 'INVALID_ENUM';
        meta.expected = issue.options?.join(', ');
        break;
      case 'invalid_string':
        if (issue.validation === 'email') code = 'INVALID_FORMAT';
        if (issue.validation === 'uuid') code = 'INVALID_FORMAT';
        if (issue.validation === 'regex') {
          code = 'INVALID_FORMAT';
          meta.pattern = issue.validation;
        }
        break;
      case 'custom':
        code = 'CUSTOM';
        break;
      default:
        code = issue.code?.toUpperCase() || 'INVALID_FORMAT';
    }
    
    return {
      field: field || 'root',
      code,
      message: issue.message,
      meta: Object.keys(meta).length > 0 ? meta : undefined,
    };
  });
}

/**
 * Validate request body against a Zod schema
 * @param {ZodSchema} schema - Zod schema to validate against
 * @returns Express middleware
 */
function validateBody(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    
    if (!result.success) {
      const errors = mapZodErrors(result.error);
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        statusCode: 400,
        message: `Validation failed: ${errors[0]?.message || 'Invalid input'}`,
        errors,
      });
    }
    
    // Replace body with parsed/transformed data
    req.body = result.data;
    next();
  };
}

/**
 * Validate request query parameters against a Zod schema
 * @param {ZodSchema} schema - Zod schema to validate against
 * @returns Express middleware
 */
function validateQuery(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.query);
    
    if (!result.success) {
      const errors = mapZodErrors(result.error);
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        statusCode: 400,
        message: `Invalid query parameters: ${errors[0]?.message || 'Invalid input'}`,
        errors,
      });
    }
    
    // Replace query with parsed/transformed data
    req.query = result.data;
    next();
  };
}

/**
 * Validate request URL parameters against a Zod schema
 * @param {ZodSchema} schema - Zod schema to validate against
 * @returns Express middleware
 */
function validateParams(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.params);
    
    if (!result.success) {
      const errors = mapZodErrors(result.error);
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        statusCode: 400,
        message: `Invalid URL parameters: ${errors[0]?.message || 'Invalid input'}`,
        errors,
      });
    }
    
    // Replace params with parsed/transformed data
    req.params = result.data;
    next();
  };
}

/**
 * Validate multiple sources at once
 * @param {Object} schemas - Object with body, query, params schemas
 * @returns Express middleware
 */
function validate({ body, query, params }) {
  return (req, res, next) => {
    const allErrors = [];
    
    if (body) {
      const result = body.safeParse(req.body);
      if (!result.success) {
        allErrors.push(...mapZodErrors(result.error));
      } else {
        req.body = result.data;
      }
    }
    
    if (query) {
      const result = query.safeParse(req.query);
      if (!result.success) {
        allErrors.push(...mapZodErrors(result.error).map(e => ({
          ...e,
          field: `query.${e.field}`,
        })));
      } else {
        req.query = result.data;
      }
    }
    
    if (params) {
      const result = params.safeParse(req.params);
      if (!result.success) {
        allErrors.push(...mapZodErrors(result.error).map(e => ({
          ...e,
          field: `params.${e.field}`,
        })));
      } else {
        req.params = result.data;
      }
    }
    
    if (allErrors.length > 0) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        statusCode: 400,
        message: `Validation failed: ${allErrors[0]?.message || 'Invalid input'}`,
        errors: allErrors,
      });
    }
    
    next();
  };
}

/**
 * Async validation for schemas that need async refinements
 * @param {ZodSchema} schema - Zod schema to validate against
 * @returns Express middleware
 */
function validateBodyAsync(schema) {
  return async (req, res, next) => {
    try {
      const result = await schema.safeParseAsync(req.body);
      
      if (!result.success) {
        const errors = mapZodErrors(result.error);
        return res.status(400).json({
          error: 'VALIDATION_ERROR',
          statusCode: 400,
          message: `Validation failed: ${errors[0]?.message || 'Invalid input'}`,
          errors,
        });
      }
      
      req.body = result.data;
      next();
    } catch (err) {
      next(err);
    }
  };
}

module.exports = {
  validateBody,
  validateQuery,
  validateParams,
  validate,
  validateBodyAsync,
  mapZodErrors,
};
