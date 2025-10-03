import * as Sentry from "@sentry/node";

export function initSentry() {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;
  // Integrations may differ across @sentry packages/versions; keep integration optional at runtime.
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const tracing = require("@sentry/tracing");
    Sentry.init({
      dsn,
      environment: process.env.NODE_ENV || "development",
      release: process.env.RELEASE || undefined,
      tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || "0.02"),
      integrations: [new (tracing.Integrations?.Http || tracing.Http || Function)({ tracing: true })],
    });
  } catch (_) {
    Sentry.init({ dsn, environment: process.env.NODE_ENV || "development" });
  }
  Sentry.setTag("service", process.env.SERVICE_NAME || "erp-service");
}

export { Sentry };
