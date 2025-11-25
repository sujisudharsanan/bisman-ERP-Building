/**
 * Production-ready logging utility for backend
 * Replaces console.log/error throughout the application
 */

class Logger {
  constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development';
    this.isProduction = process.env.NODE_ENV === 'production';
  }

  /**
   * Log debug information (only in development)
   */
  debug(message, context = {}) {
    if (this.isDevelopment) {
      console.log(`[DEBUG] ${message}`, context);
    }
  }

  /**
   * Log informational messages
   */
  info(message, context = {}) {
    console.log(`[INFO] ${message}`, Object.keys(context).length > 0 ? context : '');
    if (this.isProduction && Object.keys(context).length > 0) {
      this.sendToMonitoring('info', message, context);
    }
  }

  /**
   * Log warnings
   */
  warn(message, context = {}) {
    console.warn(`[WARN] ${message}`, Object.keys(context).length > 0 ? context : '');
    if (this.isProduction) {
      this.sendToMonitoring('warn', message, context);
    }
  }

  /**
   * Log errors
   */
  error(message, error = null, context = {}) {
    const errorDetails = error instanceof Error ? {
      message: error.message,
      stack: error.stack,
      name: error.name
    } : error;

    console.error(`[ERROR] ${message}`, errorDetails || '', Object.keys(context).length > 0 ? context : '');
    
    if (this.isProduction) {
      this.sendToMonitoring('error', message, {
        ...context,
        error: errorDetails
      });
    }
  }

  /**
   * Log HTTP requests
   */
  http(method, path, statusCode, duration, context = {}) {
    const message = `${method} ${path} - ${statusCode} (${duration}ms)`;
    if (statusCode >= 400) {
      this.warn(message, context);
    } else if (this.isDevelopment) {
      this.debug(message, context);
    }
  }

  /**
   * Send logs to monitoring service in production
   */
  sendToMonitoring(level, message, context = {}) {
    // TODO: Integrate with error monitoring service (Sentry, LogRocket, etc.)
    // Example: Sentry.captureMessage(message, { level, extra: context });
    
    // For now, keep console output in production for Railway logs
    if (level === 'error' || level === 'warn') {
      // Already logged above, no need to duplicate
    }
  }
}

module.exports = new Logger();
