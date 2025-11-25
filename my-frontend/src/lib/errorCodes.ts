/**
 * ============================================================================
 * ERROR CODE MAPPINGS
 * ============================================================================
 * 
 * Maps backend error codes to user-friendly messages
 * Centralized for consistency across the application
 */

export const ERROR_MESSAGES: Record<string, string> = {
  // Authentication Errors
  INVALID_CREDENTIALS: 'Incorrect email or password. Please try again.',
  TOKEN_EXPIRED: 'Your session has expired. Please login again.',
  TOKEN_INVALID: 'Invalid authentication. Please login again.',
  TOKEN_MISSING: 'Authentication required. Please login.',
  SESSION_EXPIRED: 'Your session has expired. Please login again.',
  
  // Authorization Errors
  INSUFFICIENT_PERMISSIONS: 'You do not have permission to perform this action.',
  ACCESS_DENIED: 'Access denied. You do not have the required permissions.',
  
  // Rate Limiting
  LOGIN_LIMIT_REACHED: 'Too many failed login attempts. Please try again later.',
  RATE_LIMIT_EXCEEDED: 'Too many requests. Please slow down and try again.',
  
  // Validation Errors
  VALIDATION_ERROR: 'Please check your input and try again.',
  INVALID_INPUT: 'The information you provided is invalid.',
  MISSING_REQUIRED_FIELD: 'Please fill in all required fields.',
  
  // Resource Errors
  RESOURCE_NOT_FOUND: 'The requested resource was not found.',
  USER_NOT_FOUND: 'User not found.',
  
  // Conflict Errors
  DUPLICATE_ENTRY: 'This information already exists in the system.',
  RESOURCE_CONFLICT: 'This action conflicts with existing data.',
  
  // Server Errors
  SERVER_ERROR: 'Something went wrong. Please try again.',
  DATABASE_ERROR: 'Database error. Please try again later.',
  EXTERNAL_SERVICE_ERROR: 'External service unavailable. Please try again later.',
  
  // Network Errors
  NETWORK_ERROR: 'Network connection failed. Please check your internet connection.',
  REQUEST_TIMEOUT: 'Request timed out. Please try again.',
  
  // Default
  UNKNOWN_ERROR: 'An unexpected error occurred. Please try again.',
};

/**
 * Get user-friendly message for error code
 */
export function getErrorMessage(errorCode?: string): string {
  if (!errorCode) {
    return ERROR_MESSAGES.UNKNOWN_ERROR;
  }
  
  return ERROR_MESSAGES[errorCode] || ERROR_MESSAGES.UNKNOWN_ERROR;
}

/**
 * Error type for styling
 */
export type ErrorType = 'error' | 'warning' | 'info';

/**
 * Get error type based on HTTP status
 */
export function getErrorType(httpStatus?: number): ErrorType {
  if (!httpStatus) return 'error';
  
  if (httpStatus >= 500) return 'error';
  if (httpStatus === 429) return 'warning';
  if (httpStatus >= 400) return 'warning';
  
  return 'info';
}

/**
 * Standard error response from backend
 */
export interface APIErrorResponse {
  success: false;
  errorCode: string;
  message: string;
  httpStatus: number;
  details?: any;
  retryAfter?: number;
  retryAfterFormatted?: string;
  stack?: string;
}

/**
 * Check if response is an error response
 */
export function isAPIError(response: any): response is APIErrorResponse {
  return (
    response &&
    response.success === false &&
    typeof response.errorCode === 'string'
  );
}
