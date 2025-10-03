# Observability & Safe Debug scaffold

This scaffold adds shared monitoring, logging, Sentry, OpenTelemetry, Prometheus metrics, and a worker pattern.

## How to use

This scaffold adds shared monitoring, logging, Sentry, OpenTelemetry, Prometheus metrics, and a worker pattern.

## How to use

1. Review files added under `libs/shared`, `apps/api`, `apps/worker`, `monitoring/` and `infra/k8s`.
2. Install dependencies (example):

```bash
npm i @sentry/node @sentry/tracing prom-client pino @opentelemetry/sdk-node @opentelemetry/auto-instrumentations-node @opentelemetry/exporter-jaeger bullmq ioredis
# plus your existing nest deps
```

3. Set required env vars (example):

```
SENTRY_DSN=... 
JAEGER_ENDPOINT=http://jaeger:14268/api/traces
SERVICE_NAME=erp-api
NODE_ENV=production
REDIS_HOST=redis
REDIS_PORT=6379
```

4. Run locally:

```bash
# API
node dist/apps/api/main.js
# Worker
node dist/apps/worker/worker.js
```

5. Prometheus: use `monitoring/prometheus/prometheus.yml` as a starting point.
6. Kubernetes manifests are in `infra/k8s`.

## Safe debug endpoints & toggles (you must implement guards)
- Add an `internal` controller behind admin-only guard that toggles runtime debug mode by setting a short-lived key in Redis. The scaffold includes a pattern and middleware to attach requestId and metrics.

## Notes on safe execution
- Run this scaffold with `--dry-run` first to preview changes.
- Use `--safe` when running automated tools that shouldn\'t abort on single file errors.
