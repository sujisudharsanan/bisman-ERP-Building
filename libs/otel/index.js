"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initOtel = void 0;
exports.initOpenTelemetry = initOpenTelemetry;
exports.shutdownOpenTelemetry = shutdownOpenTelemetry;
const initOtel = () => {
    console.log("OpenTelemetry initialized");
};
exports.initOtel = initOtel;
async function initOpenTelemetry() {
    try {
        return (0, exports.initOtel)();
    }
    catch (e) {
        console.error('initOpenTelemetry failed', e);
        return null;
    }
}
async function shutdownOpenTelemetry() {
    return Promise.resolve();
}
