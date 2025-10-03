import client from "prom-client";

export const register = client.register;

export const httpRequestDuration = new client.Histogram({
  name: "http_request_duration_seconds",
  help: "HTTP request duration in seconds",
  labelNames: ["method", "route", "statusCode", "org"],
  buckets: [0.005, 0.01, 0.05, 0.1, 0.3, 1, 2, 5],
});

export function initMetrics() {
  client.collectDefaultMetrics({ register });
}
