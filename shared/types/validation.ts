/**
 * Validation Types for BISMAN ERP
 * 
 * Standard error format used across all API endpoints
 * for consistent validation error handling.
 */

/**
 * Single field validation error
 */
export type FieldError = {
  /** Field path (e.g., 'email', 'gstin', 'lineItems[0].qty', 'address.pinCode') */
  field: string;
  
  /** Error code for programmatic handling */
  code: 
    | 'REQUIRED'
    | 'INVALID_FORMAT'
    | 'INVALID_TYPE'
    | 'TOO_SHORT'
    | 'TOO_LONG'
    | 'TOO_SMALL'
    | 'TOO_BIG'
    | 'INVALID_ENUM'
    | 'CUSTOM'
    | string;
  
  /** Human-readable error message (localized) */
  message: string;
  
  /** Extra info (min, max, pattern, expected type, etc.) */
  meta?: {
    minimum?: number;
    maximum?: number;
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    expected?: string;
    received?: string;
  };
};

/**
 * Standard validation error response format
 * All API endpoints return this shape for validation errors
 */
export type ValidationErrorResponse = {
  /** Error type identifier */
  error: 'VALIDATION_ERROR';
  
  /** HTTP status code (always 400 for validation) */
  statusCode: 400;
  
  /** Array of field-level errors */
  errors: FieldError[];
  
  /** Optional summary message */
  message?: string;
};

/**
 * Success response wrapper
 */
export type ApiSuccessResponse<T> = {
  success: true;
  data: T;
  message?: string;
};

/**
 * Generic API error response
 */
export type ApiErrorResponse = {
  success: false;
  error: string;
  message: string;
  statusCode: number;
  details?: any;
};

/**
 * Paginated response wrapper
 */
export type PaginatedResponse<T> = {
  success: true;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
};

/**
 * Zod error code to our error code mapping
 */
export const zodToFieldErrorCode: Record<string, string> = {
  'invalid_type': 'INVALID_TYPE',
  'invalid_literal': 'INVALID_FORMAT',
  'custom': 'CUSTOM',
  'invalid_union': 'INVALID_FORMAT',
  'invalid_union_discriminator': 'INVALID_FORMAT',
  'invalid_enum_value': 'INVALID_ENUM',
  'unrecognized_keys': 'INVALID_FORMAT',
  'invalid_arguments': 'INVALID_FORMAT',
  'invalid_return_type': 'INVALID_FORMAT',
  'invalid_date': 'INVALID_FORMAT',
  'invalid_string': 'INVALID_FORMAT',
  'too_small': 'TOO_SMALL',
  'too_big': 'TOO_BIG',
  'invalid_intersection_types': 'INVALID_FORMAT',
  'not_multiple_of': 'INVALID_FORMAT',
  'not_finite': 'INVALID_FORMAT',
};
