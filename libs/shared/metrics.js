"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.httpRequestDuration = exports.register = void 0;
exports.initMetrics = initMetrics;
const prom_client_1 = __importDefault(require("prom-client"));
exports.register = prom_client_1.default.register;
exports.httpRequestDuration = new prom_client_1.default.Histogram({
    name: "http_request_duration_seconds",
    help: "HTTP request duration in seconds",
    labelNames: ["method", "route", "statusCode", "org"],
    buckets: [0.005, 0.01, 0.05, 0.1, 0.3, 1, 2, 5],
});
function initMetrics() {
    prom_client_1.default.collectDefaultMetrics({ register: exports.register });
}
