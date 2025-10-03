// libs/otel/index.ts
export const initOtel = () => {
  console.log("OpenTelemetry initialized");
};

// Backwards-compatible aliases expected by the rest of the codebase
export async function initOpenTelemetry() {
  // keep the same small contract as the heavier implementation
  try {
    return initOtel();
  } catch (e) {
    // don't throw in a best-effort init
    // eslint-disable-next-line no-console
    console.error('initOpenTelemetry failed', e);
    return null;
  }
}

export async function shutdownOpenTelemetry() {
  // no-op for the lightweight stub
  return Promise.resolve();
}
