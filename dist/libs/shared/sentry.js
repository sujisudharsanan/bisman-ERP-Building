"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.Sentry = void 0;
exports.initSentry = initSentry;
const Sentry = __importStar(require("@sentry/node"));
exports.Sentry = Sentry;
function initSentry() {
    const dsn = process.env.SENTRY_DSN;
    if (!dsn)
        return;
    try {
        const tracing = require("@sentry/tracing");
        Sentry.init({
            dsn,
            environment: process.env.NODE_ENV || "development",
            release: process.env.RELEASE || undefined,
            tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || "0.02"),
            integrations: [new (tracing.Integrations?.Http || tracing.Http || Function)({ tracing: true })],
        });
    }
    catch (_) {
        Sentry.init({ dsn, environment: process.env.NODE_ENV || "development" });
    }
    Sentry.setTag("service", process.env.SERVICE_NAME || "erp-service");
}
