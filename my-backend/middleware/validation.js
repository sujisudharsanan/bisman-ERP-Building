/**
 * Zod Validation Middleware (CommonJS)
 *
 * Express middleware for validating request body, query, and params using Zod schemas.
 * Uses shared schemas from libs/shared/validation.
 *
 * @module my-backend/middleware/validation
 */

const { z } = require('zod');

/**
 * Convert Zod errors to a standardized format
 */
function formatZodErrors(error) {
  return error.errors.map((err) => ({
    field: err.path.join('.'),
    message: err.message,
    code: err.code,
  }));
}

/**
 * Validate request body with a Zod schema
 *
 * @example
 * const { customerCreateSchema } = require('./schemas/customerSchema');
 * router.post('/customers', validateBody(customerCreateSchema), createCustomer);
 *
 * @param {import('zod').ZodSchema} schema - Zod schema to validate against
 */
function validateBody(schema) {
  return async (req, res, next) => {
    try {
      const result = await schema.safeParseAsync(req.body);

      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Invalid request data',
          errors: formatZodErrors(result.error),
        });
      }

      // Replace body with parsed/transformed data
      req.body = result.data;
      next();
    } catch (err) {
      console.error('Validation middleware error:', err);
      return res.status(500).json({
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Validation failed unexpectedly',
      });
    }
  };
}

/**
 * Validate request query params with a Zod schema
 *
 * @example
 * const { customerListFiltersSchema } = require('./schemas/customerSchema');
 * router.get('/customers', validateQuery(customerListFiltersSchema), listCustomers);
 *
 * @param {import('zod').ZodSchema} schema - Zod schema to validate against
 */
function validateQuery(schema) {
  return async (req, res, next) => {
    try {
      const result = await schema.safeParseAsync(req.query);

      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Invalid query parameters',
          errors: formatZodErrors(result.error),
        });
      }

      // Store validated query separately
      req.validatedQuery = result.data;
      next();
    } catch (err) {
      console.error('Query validation middleware error:', err);
      return res.status(500).json({
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Query validation failed unexpectedly',
      });
    }
  };
}

/**
 * Validate request params with a Zod schema
 *
 * @example
 * const idParamSchema = z.object({ id: z.coerce.number().int().positive() });
 * router.get('/customers/:id', validateParams(idParamSchema), getCustomer);
 *
 * @param {import('zod').ZodSchema} schema - Zod schema to validate against
 */
function validateParams(schema) {
  return async (req, res, next) => {
    try {
      const result = await schema.safeParseAsync(req.params);

      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Invalid URL parameters',
          errors: formatZodErrors(result.error),
        });
      }

      // Store validated params separately
      req.validatedParams = result.data;
      next();
    } catch (err) {
      console.error('Params validation middleware error:', err);
      return res.status(500).json({
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Params validation failed unexpectedly',
      });
    }
  };
}

/**
 * Combined validation for body, query, and params
 *
 * @example
 * router.put('/customers/:id',
 *   validate({
 *     params: idParamSchema,
 *     body: customerUpdateSchema,
 *   }),
 *   updateCustomer
 * );
 *
 * @param {{ body?: import('zod').ZodSchema, query?: import('zod').ZodSchema, params?: import('zod').ZodSchema }} schemas
 */
function validate(schemas) {
  return async (req, res, next) => {
    const errors = [];

    try {
      // Validate params
      if (schemas.params) {
        const result = await schemas.params.safeParseAsync(req.params);
        if (!result.success) {
          errors.push(...formatZodErrors(result.error).map((e) => ({ ...e, field: `params.${e.field}` })));
        } else {
          req.validatedParams = result.data;
        }
      }

      // Validate query
      if (schemas.query) {
        const result = await schemas.query.safeParseAsync(req.query);
        if (!result.success) {
          errors.push(...formatZodErrors(result.error).map((e) => ({ ...e, field: `query.${e.field}` })));
        } else {
          req.validatedQuery = result.data;
        }
      }

      // Validate body
      if (schemas.body) {
        const result = await schemas.body.safeParseAsync(req.body);
        if (!result.success) {
          errors.push(...formatZodErrors(result.error));
        } else {
          req.body = result.data;
        }
      }

      if (errors.length > 0) {
        return res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Invalid request data',
          errors,
        });
      }

      next();
    } catch (err) {
      console.error('Combined validation middleware error:', err);
      return res.status(500).json({
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Validation failed unexpectedly',
      });
    }
  };
}

/**
 * Standalone validation function (for use outside middleware)
 *
 * @example
 * const result = await validateData(customerCreateSchema, data);
 * if (!result.success) {
 *   console.log(result.errors);
 * }
 *
 * @param {import('zod').ZodSchema} schema - Zod schema to validate against
 * @param {unknown} data - Data to validate
 * @returns {Promise<{ success: boolean, data?: any, errors?: Array<{ field: string, message: string, code: string }> }>}
 */
async function validateData(schema, data) {
  try {
    const result = await schema.safeParseAsync(data);

    if (!result.success) {
      return {
        success: false,
        errors: formatZodErrors(result.error),
      };
    }

    return {
      success: true,
      data: result.data,
    };
  } catch (err) {
    return {
      success: false,
      errors: [{ field: '', message: 'Validation failed unexpectedly', code: 'internal_error' }],
    };
  }
}

module.exports = {
  validateBody,
  validateQuery,
  validateParams,
  validate,
  validateData,
  formatZodErrors,
};
