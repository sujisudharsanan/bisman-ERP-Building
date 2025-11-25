/**
 * Production-ready logging utility
 * Replaces console.log/error throughout the application
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: any;
}

class Logger {
  private isDevelopment: boolean;
  private isProduction: boolean;

  constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development';
    this.isProduction = process.env.NODE_ENV === 'production';
  }

  /**
   * Log debug information (only in development)
   */
  debug(message: string, context?: LogContext): void {
    if (this.isDevelopment) {
      console.log(`[DEBUG] ${message}`, context || '');
    }
  }

  /**
   * Log informational messages
   */
  info(message: string, context?: LogContext): void {
    if (this.isDevelopment) {
      console.log(`[INFO] ${message}`, context || '');
    }
    // In production, send to monitoring service (e.g., Sentry, LogRocket)
    if (this.isProduction && context) {
      this.sendToMonitoring('info', message, context);
    }
  }

  /**
   * Log warnings
   */
  warn(message: string, context?: LogContext): void {
    console.warn(`[WARN] ${message}`, context || '');
    if (this.isProduction) {
      this.sendToMonitoring('warn', message, context);
    }
  }

  /**
   * Log errors
   */
  error(message: string, error?: Error | unknown, context?: LogContext): void {
    const errorDetails = error instanceof Error ? {
      message: error.message,
      stack: error.stack,
      name: error.name
    } : error;

    console.error(`[ERROR] ${message}`, errorDetails, context || '');
    
    if (this.isProduction) {
      this.sendToMonitoring('error', message, {
        ...context,
        error: errorDetails
      });
    }
  }

  /**
   * Send logs to monitoring service in production
   */
  private sendToMonitoring(level: LogLevel, message: string, context?: LogContext): void {
    // TODO: Integrate with error monitoring service (Sentry, LogRocket, etc.)
    // Example: Sentry.captureMessage(message, { level, extra: context });
    
    // For now, keep console output in production for Railway/Vercel logs
    if (level === 'error' || level === 'warn') {
      console[level](`[${level.toUpperCase()}] ${message}`, context);
    }
  }
}

export const logger = new Logger();
