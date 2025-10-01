import pino from 'pino'
import { Injectable, LoggerService } from '@nestjs/common'

@Injectable()
export class CustomLogger implements LoggerService {
  private logger: pino.Logger

  constructor() {
    this.logger = pino({
      level: process.env.LOG_LEVEL || 'info',
      formatters: {
        level: (label) => {
          return { level: label }
        },
      },
      timestamp: pino.stdTimeFunctions.isoTime,
      ...(process.env.NODE_ENV === 'production' && {
        redact: ['password', 'token', 'authorization', 'cookie']
      })
    })
  }

  log(message: any, context?: string) {
    this.logger.info({ context }, message)
  }

  error(message: any, trace?: string, context?: string) {
    this.logger.error({ context, trace }, message)
  }

  warn(message: any, context?: string) {
    this.logger.warn({ context }, message)
  }

  debug(message: any, context?: string) {
    this.logger.debug({ context }, message)
  }

  verbose(message: any, context?: string) {
    this.logger.trace({ context }, message)
  }

  // Custom methods for structured logging
  logUserAction(userId: number, action: string, details?: any) {
    this.logger.info({
      type: 'user_action',
      userId,
      action,
      details,
      timestamp: new Date().toISOString()
    })
  }

  logSecurityEvent(event: string, details: any) {
    this.logger.warn({
      type: 'security_event',
      event,
      details,
      timestamp: new Date().toISOString()
    })
  }

  logPerformance(operation: string, duration: number, details?: any) {
    this.logger.info({
      type: 'performance',
      operation,
      duration,
      details,
      timestamp: new Date().toISOString()
    })
  }
}
