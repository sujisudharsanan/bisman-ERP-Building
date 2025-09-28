import { NodeSDK } from "@opentelemetry/sdk-node";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { JaegerExporter } from "@opentelemetry/exporter-jaeger";

let sdk: NodeSDK | null = null;

export async function initOpenTelemetry() {
  if (!process.env.JAEGER_ENDPOINT) return null;
  sdk = new NodeSDK({
    traceExporter: new JaegerExporter({
      endpoint: process.env.JAEGER_ENDPOINT,
    }),
  instrumentations: [getNodeAutoInstrumentations()],
  });
  await sdk.start();
  return sdk;
}

export async function shutdownOpenTelemetry() {
  if (sdk) await sdk.shutdown();
}
