/**
 * Zod Validation Middleware
 *
 * Express middleware for validating request body, query, and params using Zod schemas.
 * Uses shared schemas from libs/shared/validation.
 *
 * @module my-backend/middleware/validation
 */

import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ValidationResult {
  success: boolean;
  data?: any;
  errors?: ValidationError[];
}

/**
 * Convert Zod errors to a standardized format
 */
function formatZodErrors(error: ZodError): ValidationError[] {
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
 * import { customerCreateSchema } from '@/libs/shared/validation';
 * router.post('/customers', validateBody(customerCreateSchema), createCustomer);
 */
export function validateBody<T>(schema: ZodSchema<T>) {
  return async (req: Request, res: Response, next: NextFunction) => {
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
 * import { customerListFiltersSchema } from '@/libs/shared/validation';
 * router.get('/customers', validateQuery(customerListFiltersSchema), listCustomers);
 */
export function validateQuery<T>(schema: ZodSchema<T>) {
  return async (req: Request, res: Response, next: NextFunction) => {
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

      // Replace query with parsed/transformed data
      (req as any).validatedQuery = result.data;
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
 */
export function validateParams<T>(schema: ZodSchema<T>) {
  return async (req: Request, res: Response, next: NextFunction) => {
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

      // Replace params with parsed/transformed data
      (req as any).validatedParams = result.data;
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
 */
export function validate(schemas: {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const errors: ValidationError[] = [];

    try {
      // Validate params
      if (schemas.params) {
        const result = await schemas.params.safeParseAsync(req.params);
        if (!result.success) {
          errors.push(...formatZodErrors(result.error).map((e) => ({ ...e, field: `params.${e.field}` })));
        } else {
          (req as any).validatedParams = result.data;
        }
      }

      // Validate query
      if (schemas.query) {
        const result = await schemas.query.safeParseAsync(req.query);
        if (!result.success) {
          errors.push(...formatZodErrors(result.error).map((e) => ({ ...e, field: `query.${e.field}` })));
        } else {
          (req as any).validatedQuery = result.data;
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
 */
export async function validateData<T>(schema: ZodSchema<T>, data: unknown): Promise<ValidationResult> {
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

export default {
  validateBody,
  validateQuery,
  validateParams,
  validate,
  validateData,
};
