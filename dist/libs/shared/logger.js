"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
exports.childLogger = childLogger;
const pino_1 = __importDefault(require("pino"));
exports.logger = (0, pino_1.default)({
    level: process.env.LOG_LEVEL || "info",
    base: { service: process.env.SERVICE_NAME || "erp-service", env: process.env.NODE_ENV || "development" },
    timestamp: pino_1.default.stdTimeFunctions.isoTime,
});
function childLogger(bindings = {}) {
    return exports.logger.child(bindings);
}
