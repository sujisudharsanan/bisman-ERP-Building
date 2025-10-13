"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AllExceptionsFilter = void 0;
const common_1 = require("@nestjs/common");
const sentry_1 = require("../sentry");
let AllExceptionsFilter = class AllExceptionsFilter {
    catch(exception, host) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse();
        const request = ctx.getRequest();
        const status = exception instanceof common_1.HttpException ? exception.getStatus() : common_1.HttpStatus.INTERNAL_SERVER_ERROR;
        sentry_1.Sentry.withScope((scope) => {
            scope.setTag("service", process.env.SERVICE_NAME || "erp-service");
            scope.setTag("process", process.env.PROCESS_TYPE || "api");
            scope.setExtra("requestId", request?.requestId);
            scope.setExtra("url", request?.originalUrl);
            scope.setExtra("method", request?.method);
            if (request?.user)
                scope.setUser({ id: request.user.id, email: request.user.email });
            sentry_1.Sentry.captureException(exception);
        });
        const message = exception instanceof common_1.HttpException ? exception.getResponse() : { message: "Internal server error" };
        response.status(status).json({ statusCode: status, requestId: request?.requestId, error: message });
    }
};
exports.AllExceptionsFilter = AllExceptionsFilter;
exports.AllExceptionsFilter = AllExceptionsFilter = __decorate([
    (0, common_1.Catch)()
], AllExceptionsFilter);
