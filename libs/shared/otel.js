"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initOpenTelemetry = initOpenTelemetry;
exports.shutdownOpenTelemetry = shutdownOpenTelemetry;
const sdk_node_1 = require("@opentelemetry/sdk-node");
const auto_instrumentations_node_1 = require("@opentelemetry/auto-instrumentations-node");
const exporter_jaeger_1 = require("@opentelemetry/exporter-jaeger");
let sdk = null;
async function initOpenTelemetry() {
    if (!process.env.JAEGER_ENDPOINT)
        return null;
    sdk = new sdk_node_1.NodeSDK({
        traceExporter: new exporter_jaeger_1.JaegerExporter({
            endpoint: process.env.JAEGER_ENDPOINT,
        }),
        instrumentations: [(0, auto_instrumentations_node_1.getNodeAutoInstrumentations)()],
    });
    await sdk.start();
    return sdk;
}
async function shutdownOpenTelemetry() {
    if (sdk)
        await sdk.shutdown();
}
