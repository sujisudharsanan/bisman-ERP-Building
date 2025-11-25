/**
 * ============================================================================
 * GLOBAL ERROR HANDLER MIDDLEWARE
 * ============================================================================
 * 
 * Centralized error handling for consistent API error responses
 * Features:
 * - Structured JSON error format
 * - Error code standardization
 * - Automatic logging
 * - Development/Production mode differentiation
 * - HTTP status code mapping
 * 
 * @module middleware/errorHandler
 */

const { logError } = require('../utils/errorLogger');

/**
 * Standard Error Codes
 * Maps to user-friendly messages on frontend
 */
const ERROR_CODES = {
  // Authentication Errors (401)
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  TOKEN_INVALID: 'TOKEN_INVALID',
  TOKEN_MISSING: 'TOKEN_MISSING',
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  
  // Authorization Errors (403)
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
  ACCESS_DENIED: 'ACCESS_DENIED',
  
  // Rate Limiting (429)
  LOGIN_LIMIT_REACHED: 'LOGIN_LIMIT_REACHED',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  
  // Validation Errors (400)
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  
  // Resource Errors (404)
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  
  // Conflict Errors (409)
  DUPLICATE_ENTRY: 'DUPLICATE_ENTRY',
  RESOURCE_CONFLICT: 'RESOURCE_CONFLICT',
  
  // Server Errors (500)
  SERVER_ERROR: 'SERVER_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
};

/**
 * Custom Error Class
 * Use this to throw errors with specific codes and statuses
 */
class AppError extends Error {
  constructor(message, errorCode, httpStatus = 500, details = null) {
    super(message);
    this.name = 'AppError';
    this.errorCode = errorCode;
    this.httpStatus = httpStatus;
    this.details = details;
    this.isOperational = true; // Operational errors vs programming errors
  }
}

/**
 * Map error code to HTTP status
 */
function getHttpStatus(errorCode) {
  const statusMap = {
    // 400 - Bad Request
    VALIDATION_ERROR: 400,
    INVALID_INPUT: 400,
    MISSING_REQUIRED_FIELD: 400,
    
    // 401 - Unauthorized
    INVALID_CREDENTIALS: 401,
    TOKEN_EXPIRED: 401,
    TOKEN_INVALID: 401,
    TOKEN_MISSING: 401,
    SESSION_EXPIRED: 401,
    
    // 403 - Forbidden
    INSUFFICIENT_PERMISSIONS: 403,
    ACCESS_DENIED: 403,
    
    // 404 - Not Found
    RESOURCE_NOT_FOUND: 404,
    USER_NOT_FOUND: 404,
    
    // 409 - Conflict
    DUPLICATE_ENTRY: 409,
    RESOURCE_CONFLICT: 409,
    
    // 429 - Too Many Requests
    LOGIN_LIMIT_REACHED: 429,
    RATE_LIMIT_EXCEEDED: 429,
    
    // 500 - Server Error
    SERVER_ERROR: 500,
    DATABASE_ERROR: 500,
    EXTERNAL_SERVICE_ERROR: 500,
  };
  
  return statusMap[errorCode] || 500;
}

/**
 * Format error response
 */
function formatErrorResponse(error, req) {
  const isDevelopment = process.env.NODE_ENV !== 'production';
  
  // Determine error code and status
  let errorCode = error.errorCode || ERROR_CODES.SERVER_ERROR;
  let httpStatus = error.httpStatus || getHttpStatus(errorCode);
  let message = error.message || 'An unexpected error occurred';
  let details = error.details || null;
  
  // Handle specific error types
  
  // Prisma Errors
  if (error.code?.startsWith('P')) {
    errorCode = ERROR_CODES.DATABASE_ERROR;
    httpStatus = 500;
    message = isDevelopment ? error.message : 'Database operation failed';
    
    // Prisma unique constraint violation
    if (error.code === 'P2002') {
      errorCode = ERROR_CODES.DUPLICATE_ENTRY;
      httpStatus = 409;
      message = 'A record with this information already exists';
    }
    
    // Prisma record not found
    if (error.code === 'P2025') {
      errorCode = ERROR_CODES.RESOURCE_NOT_FOUND;
      httpStatus = 404;
      message = 'The requested resource was not found';
    }
  }
  
  // JWT Errors
  if (error.name === 'JsonWebTokenError') {
    errorCode = ERROR_CODES.TOKEN_INVALID;
    httpStatus = 401;
    message = 'Invalid authentication token';
  }
  
  if (error.name === 'TokenExpiredError') {
    errorCode = ERROR_CODES.TOKEN_EXPIRED;
    httpStatus = 401;
    message = 'Authentication token has expired';
  }
  
  // Validation Errors (express-validator)
  if (error.name === 'ValidationError' || error.array) {
    errorCode = ERROR_CODES.VALIDATION_ERROR;
    httpStatus = 400;
    message = 'Validation failed';
    details = error.array ? error.array() : error.details;
  }
  
  // Build response
  const response = {
    success: false,
    errorCode,
    message,
    httpStatus,
  };
  
  // Add details in development or if provided
  if (details) {
    response.details = details;
  }
  
  // Add stack trace in development
  if (isDevelopment && error.stack) {
    response.stack = error.stack;
  }
  
  // Add retry information for rate limiting
  if (errorCode === ERROR_CODES.LOGIN_LIMIT_REACHED || errorCode === ERROR_CODES.RATE_LIMIT_EXCEEDED) {
    response.retryAfter = error.retryAfter || 900; // 15 minutes default
    response.retryAfterFormatted = formatRetryTime(response.retryAfter);
  }
  
  return { response, httpStatus };
}

/**
 * Format retry time to human-readable string
 */
function formatRetryTime(seconds) {
  if (seconds < 60) {
    return `${seconds} seconds`;
  }
  const minutes = Math.floor(seconds / 60);
  return `${minutes} minute${minutes > 1 ? 's' : ''}`;
}

/**
 * Main Error Handler Middleware
 * Must be registered AFTER all routes
 */
function errorHandler(err, req, res, next) {
  // Log the error
  logError(err, req);
  
  // Format response
  const { response, httpStatus } = formatErrorResponse(err, req);
  
  // Send response
  res.status(httpStatus).json(response);
}

/**
 * 404 Not Found Handler
 * Should be registered after all routes but before errorHandler
 */
function notFoundHandler(req, res, next) {
  const error = new AppError(
    `Route ${req.method} ${req.originalUrl} not found`,
    ERROR_CODES.RESOURCE_NOT_FOUND,
    404
  );
  next(error);
}

/**
 * Async handler wrapper
 * Catches async errors and passes to error handler
 * 
 * Usage:
 * router.get('/path', asyncHandler(async (req, res) => {
 *   const data = await someAsyncOperation();
 *   res.json(data);
 * }));
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = {
  errorHandler,
  notFoundHandler,
  asyncHandler,
  AppError,
  ERROR_CODES,
};
