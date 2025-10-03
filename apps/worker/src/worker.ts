import "reflect-metadata";
let initSentry: () => void = () => {};
try {
  // load optional Sentry integration at runtime (may be absent in some setups)
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const sentry = require("@libs/sentry");
  if (sentry && typeof sentry.initSentry === "function") {
    initSentry = sentry.initSentry;
  }
} catch (_) {}
import { initOpenTelemetry, shutdownOpenTelemetry } from "@libs/otel";
import { childLogger } from "@libs/logger";
import { Worker } from "bullmq";

async function startWorker() {
  initSentry();
  const otel = await initOpenTelemetry();
  const logger = childLogger({ process: "worker" });

  const connection = { host: process.env.REDIS_HOST || "127.0.0.1", port: +(process.env.REDIS_PORT || 6379) };
  // QueueScheduler may not be exported in all versions of bullmq's types; require at runtime.
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const bmq = require("bullmq");
    if (bmq && typeof bmq.QueueScheduler === "function") {
      // create scheduler without relying on static types
      // @ts-ignore - runtime usage
      new bmq.QueueScheduler("default", { connection });
    }
  } catch (_) {}

  const worker = new Worker("default", async (job) => {
    logger.info({ jobId: job.id, name: job.name }, "processing job");
    // TODO: place job handlers here
    return { ok: true };
  }, { connection, concurrency: +(process.env.WORKER_CONCURRENCY || 5) });

  worker.on("failed", (job, err) => {
    logger.error({ jobId: job.id, err }, "job failed");
    try { (require("../../libs/shared/sentry")).Sentry.captureException(err); } catch (_) {}
  });

  const graceful = async () => {
    logger.info("worker shutdown requested");
    try { await worker.close(); } catch (e) { logger.error({ e }, "close worker err"); }
    try { await shutdownOpenTelemetry(); } catch (e) { logger.error({ e }, "otel shutdown err"); }
    process.exit(0);
  };

  process.on("SIGTERM", graceful);
  process.on("SIGINT", graceful);
}

startWorker().catch((err) => {
  console.error("worker start failed", err);
  process.exit(1);
});
