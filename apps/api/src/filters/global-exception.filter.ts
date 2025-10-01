import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common'
import { Request, Response } from 'express'

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<Response>()
    const request = ctx.getRequest<Request>()

    let status = HttpStatus.INTERNAL_SERVER_ERROR
    let message = 'Internal server error'
    let details: any = null

    if (exception instanceof HttpException) {
      status = exception.getStatus()
      const exceptionResponse = exception.getResponse()
      message = typeof exceptionResponse === 'string' ? exceptionResponse : (exceptionResponse as any).message
      details = typeof exceptionResponse === 'object' ? exceptionResponse : null
    }

    // Log error for monitoring
    console.error(`[${new Date().toISOString()}] ${request.method} ${request.url}`, {
      status,
      message,
      details,
      stack: exception instanceof Error ? exception.stack : null,
      userAgent: request.headers['user-agent'],
      ip: request.ip
    })

    // Don't leak sensitive information in production
    if (process.env.NODE_ENV === 'production' && status === 500) {
      message = 'Internal server error'
      details = null
    }

    response.status(status).json({
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
      ...(details && { details })
    })
  }
}
