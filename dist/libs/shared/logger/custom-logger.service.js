"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CustomLogger = void 0;
const pino_1 = __importDefault(require("pino"));
const common_1 = require("@nestjs/common");
let CustomLogger = class CustomLogger {
    logger;
    constructor() {
        this.logger = (0, pino_1.default)({
            level: process.env.LOG_LEVEL || 'info',
            formatters: {
                level: (label) => {
                    return { level: label };
                },
            },
            timestamp: pino_1.default.stdTimeFunctions.isoTime,
            ...(process.env.NODE_ENV === 'production' && {
                redact: ['password', 'token', 'authorization', 'cookie']
            })
        });
    }
    log(message, context) {
        this.logger.info({ context }, message);
    }
    error(message, trace, context) {
        this.logger.error({ context, trace }, message);
    }
    warn(message, context) {
        this.logger.warn({ context }, message);
    }
    debug(message, context) {
        this.logger.debug({ context }, message);
    }
    verbose(message, context) {
        this.logger.trace({ context }, message);
    }
    logUserAction(userId, action, details) {
        this.logger.info({
            type: 'user_action',
            userId,
            action,
            details,
            timestamp: new Date().toISOString()
        });
    }
    logSecurityEvent(event, details) {
        this.logger.warn({
            type: 'security_event',
            event,
            details,
            timestamp: new Date().toISOString()
        });
    }
    logPerformance(operation, duration, details) {
        this.logger.info({
            type: 'performance',
            operation,
            duration,
            details,
            timestamp: new Date().toISOString()
        });
    }
};
exports.CustomLogger = CustomLogger;
exports.CustomLogger = CustomLogger = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], CustomLogger);
