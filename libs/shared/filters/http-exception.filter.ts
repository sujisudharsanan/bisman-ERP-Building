import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from "@nestjs/common";
import { Sentry } from "../sentry";

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    Sentry.withScope((scope) => {
      scope.setTag("service", process.env.SERVICE_NAME || "erp-service");
      scope.setTag("process", process.env.PROCESS_TYPE || "api");
      scope.setExtra("requestId", request?.requestId);
      scope.setExtra("url", request?.originalUrl);
      scope.setExtra("method", request?.method);
      if (request?.user) scope.setUser({ id: request.user.id, email: request.user.email });
      Sentry.captureException(exception);
    });

    const message = exception instanceof HttpException ? exception.getResponse() : { message: "Internal server error" };
    response.status(status).json({ statusCode: status, requestId: request?.requestId, error: message });
  }
}
