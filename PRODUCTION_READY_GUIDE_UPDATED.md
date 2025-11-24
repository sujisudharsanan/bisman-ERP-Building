# BISMAN ERP Production Rebuild Guide (Updated 2025-11-24)

This concise guide captures the upgraded production build approach applied now. It unifies frontend + backend expectations, container standards, and deployment checks.

## Objectives
- Deterministic builds (locked Node 20 Alpine runtime for multi-stage images)
- Skip non-essential dev steps in CI while retaining local safety (lint/type-check gated in `prebuild`)
- Multi-stage Docker efficiency: minimal runtime layers, non-root user, health checks
- Clear env contract for API + Mattermost, safe defaults
- Production checklist for final verification

## Frontend Build
1. `npm run build` produces Next standalone output (`.next/standalone`).
2. Runtime command: `node .next/standalone/server.js` (already set as `start` script).
3. `NEXT_PUBLIC_API_URL` can be omitted to use same-origin `/api` proxy; supply for external backend.
4. Telemetry disabled via `NEXT_TELEMETRY_DISABLED=1`.

## Backend Build
1. Prisma client generated in build stage.
2. Migrations applied on container start by `scripts/start-with-migrate.js` (root docker or production Dockerfile variant).
3. Health endpoint executed via `node dist/health-check.js` (ensure file exists / implement if missing).

## Docker Summary
- Root `Dockerfile` builds fullstack for Railway (backend + Next). Uses `dumb-init` and production-only dependencies at runtime.
- `my-frontend/Dockerfile` & `my-backend/Dockerfile` support separate service deployment if using multi-service infra.
- `Dockerfile.production` kept for legacy backend-only builds; consider aligning Node version to 20 for consistency.

## Recommended Enhancements (Applied / Pending)
| Item | Status | Notes |
|------|--------|-------|
| Align all Node versions to 20-alpine | Applied | Updated `Dockerfile.production` to node:20-alpine. |
| Add container health script | Applied | Added `my-backend/health-check.js` and wired in `Dockerfile.production`. |
| Introduce build arg for `NEXT_PUBLIC_API_URL` | Applied | Present in root Dockerfile. |
| Add DB migration clean state | Pending | Existing DB conflicts prevented migrate; use fresh schema or manual reconciliation. |
| Harden CSP (remove unsafe-inline) | Future | Requires nonce pipeline; tracked separately. |
| Add image pruning step in CI | Future | Use build cache + `docker buildx`. |
| Baseline migration script | Applied | `my-backend/scripts/generate-prisma-baseline.sh` generates diff. |
| Manual chat/calls bootstrap | Applied | `my-backend/migrations/manual-bootstrap-chat-calls.sql`. |
| Jest open handles mitigation | Applied | `forceExit` + disconnect added to backend config/tests. |
| Optional CSP nonce injection | Applied | Nonce on `<body>` when `CSP_STRICT=1`. |
| CI build & security scan | Applied | Workflow `.github/workflows/build-and-scan.yml` (Buildx + Trivy). |

## Minimal Deployment Steps (Fullstack Image)
1. `docker build -t bisman:latest .`
2. `docker run -e DATABASE_URL=... -e NEXT_PUBLIC_API_URL=/api -p 8080:8080 bisman:latest`
3. Confirm logs: migrations executed, Next ready, health endpoints 200.

## Production Verification Checklist
- [ ] Backend migrations run without error (current DB requires reconciliation)
- [x] Health script executes (container HEALTHCHECK wired)
- [x] Health HTTP route returns 200 (`/api/health` added)
- [x] Frontend serves and proxies API/mattermost rewrites correctly
- [x] No TypeScript errors (type-check task clean)
- [x] No ESLint critical errors (prebuild gating local)
- [x] Containers run as non-root
- [x] Environment variables documented & provided

## Key Environment Variables
| Variable | Purpose | Default |
|----------|---------|---------|
| DATABASE_URL | PostgreSQL connection | (required) |
| NEXT_PUBLIC_API_URL | External API base (rewrite) | `/api` (same-origin) |
| MM_BASE_URL | Mattermost base domain | `http://localhost:8065` |
| NODE_ENV | Runtime mode | `production` |
| PORT | Service port | `8080` (root image) / `3000` (frontend-only) |
| NEXT_TELEMETRY_DISABLED | Disable Next telemetry | `1` |

## Multi-Service Option
If deploying frontend and backend separately:
- Build each with its own Dockerfile in `my-frontend/` and `my-backend/`.
- Set `NEXT_PUBLIC_API_URL` to backend public URL.
- Ensure CORS configured server-side or rely on same-origin with reverse proxy.

## Manual Bootstrap (Migration Conflicts)
If Prisma migrations are blocked by legacy sequences/constraints:
1. Apply `my-backend/migrations/manual-bootstrap-chat-calls.sql` to create `thread_members` and `call_logs`.
2. Verify tables exist: `SELECT * FROM thread_members LIMIT 1;` / `SELECT * FROM call_logs LIMIT 1;`.
3. Re-run backend tests; confirm absence of missing table errors.
4. Later: generate a proper Prisma baseline by `prisma migrate diff` between empty schema and current DB.
5. Script helper: run `./my-backend/scripts/generate-prisma-baseline.sh` to create introspected baseline folder.

## Enabling Strict CSP (Optional)
Set `CSP_STRICT=1` at build time to emit a runtime nonce available via `data-nonce` on `<body>`. You must then:
1. Replace inline `<script>` and `<style>` with nonce-bearing tags.
2. Update CSP header in `next.config.js` to include `script-src 'self' 'nonce-${NONCE}'` and drop `unsafe-inline`.
3. Validate pages load without CSP violations in browser DevTools.

## CI Build & Scan
Workflow `.github/workflows/build-and-scan.yml` performs:
1. Multi-arch Buildx build with layer cache.
2. Trivy filesystem & image vulnerability scan (HIGH/CRITICAL).
3. SARIF upload for GitHub Security tab visibility.
Tune severities by editing `severity:` fields in the YAML.

## Deployment Dry Run
To validate image builds and runtime without pushing:
1. Build: `docker build -t bisman-fullstack:dryrun .`
2. Run backend/front combined: `docker run --rm -e DATABASE_URL=postgres://... -p 8080:8080 bisman-fullstack:dryrun`
3. Check health: `curl -sf localhost:8080/api/health` (should return JSON `{ ok: true }`).
4. Inspect image size: `docker image inspect bisman-fullstack:dryrun -f '{{.Size}}'`.
5. Scan locally (optional): `trivy image bisman-fullstack:dryrun`.

## Bundle & Performance Profiling
Scripts added in `my-frontend/scripts/`:
- `profile-server.sh` launches dev with inspector on :9229.
- `analyze-bundle.sh` builds with `ANALYZE=1` to produce bundle report.
Enable analyzer manually: `ANALYZE=1 npm run build`.

## Strict CSP Mode
Set `CSP_STRICT=1` to switch CSP headers to nonce-based. Middleware injects dynamic nonce (`X-CSP-Nonce`) and replaces placeholder.
Refactor any inline `<script>` or `<style>` to include nonce or eliminate them before enabling in production.

## Database Reconciliation Reference
See `DB_RECONCILIATION_PLAN.md` for baseline procedure; apply manual chat/calls SQL before generating baseline if tables missing.

## Notes
This file complements existing `PRODUCTION_READINESS.md` and `PRODUCTION_DEPLOYMENT_GUIDE.md`. It focuses strictly on the rebuilt container + build mechanics.

## Frontend Runtime Config Panel (Optional)
Set `NEXT_PUBLIC_SHOW_CONFIG=1` to display a small floating panel (in `RootLayout`) showing:
- API base URL resolved
- Mattermost team slug
- Strict CSP status
- Environment (prod/dev)
This aids staging verification. Disable by unsetting or setting `NEXT_PUBLIC_SHOW_CONFIG=0`.

## Rate Limiting Environment Variables
These tune category-specific limits (defaults embedded in code). All values are per configured window.
| Variable | Default | Window | Description |
|----------|---------|--------|-------------|
| LOGIN_RATE_LIMIT | 5 | 15m | Max login attempts per IP (strict) |
| AUTH_RATE_LIMIT | 20 | 10m | Token refresh/logout requests |
| API_RATE_LIMIT | 100 | 5m | General authenticated API calls |
| PUBLIC_RATE_LIMIT | 60 | 1m | Public endpoints (health/metrics) |
| EXPENSIVE_RATE_LIMIT | 10 | 60m | Reports / AI heavy operations |
| RATE_LIMIT_WHITELIST | (empty) | n/a | Comma-separated IPs exempt from limits |
| REDIS_URL | (empty) | n/a | Enables Redis-backed distributed store |

Adaptive limiters (chat/calls) multiply base limit for authenticated users (2x) and admins (5x). Adjust base by editing `app.js` adaptive limiter config.

## Automatic Bootstrap (Dev/Staging Only)
Set `AUTO_BOOTSTRAP_CHAT_CALLS=1` to auto-create minimal `thread_members` and `call_logs` tables at startup if missing.
Use only for local/staging convenience prior to proper baseline migration reconciliation.

## Test / Development Shortcuts (Not for Production)
| Variable | Effect |
|----------|--------|
| SKIP_DB=1 | Forces in-memory call/chat logic; Prisma models bypassed |
| SKIP_REDIS=1 | Disables Redis connection, uses in-memory token/cache store |
| AUTO_BOOTSTRAP_CHAT_CALLS=1 | Creates chat/call tables if absent (see above) |

These variables facilitate local and CI tests without full infrastructure. Ensure they are UNSET in production deployments.

## Strict CSP Implementation Status
When `CSP_STRICT=1`:
- `script-src` and `style-src` drop `unsafe-inline` / `unsafe-eval` and require a runtime nonce.
- Middleware issues `X-CSP-Nonce` header and `<body data-nonce>` attribute.
- Example of nonce usage added in `layout.tsx` via `NoncedScript` component.
Refactor remaining inline styles/scripts to use nonce or external files before enabling strict mode broadly.

## New Security & Compliance Additions
- SBOM generation (Syft) integrated: artifact produced in CI, local script `security/generate-sbom.sh`.
- Rate limit strategy documented (`RATE_LIMIT_TUNING.md`) with staged rollout plan.
- Redis cache strategy documented (`REDIS_CACHE_REVIEW.md`): key taxonomy, TTL policy, observability, failover modes.

## Production Verification Checklist (Extended)
- [ ] Backend migrations run without error (current DB requires reconciliation)
- [x] Health script executes (container HEALTHCHECK wired)
- [x] Health HTTP route returns 200 (`/api/health` added)
- [x] Frontend serves and proxies API/mattermost rewrites correctly
- [x] No TypeScript errors (type-check task clean)
- [x] No ESLint critical errors (prebuild gating local)
- [x] Containers run as non-root
- [x] Environment variables documented & provided
- [x] SBOM generated and archived (supply-chain transparency)
- [x] Rate limit policy documented (implementation pending final code wiring)
- [x] Redis cache review documented (instrumentation/metrics pending)

---
Generated automatically as part of production readiness rebuild.

## System Health & Performance Center

Enterprise Admin dashboard exposing live metrics & editable thresholds.

### Endpoints
`/api/system-health` (GET): metricsSummary, implementationFeatures, latencySeries, errorRateSeries, alerts, systemInfo.
`/api/system-health/settings` (GET/PATCH): persisted thresholds, backupLocation, refreshInterval.
`/api/system-health/backup` (POST): run backup script if present.
`/api/system-health/health-check` (POST): executes DB health script with JSON output.
`/api/system-health/index-audit` (POST): runs index audit script.
Legacy `/config` PATCH delegates to `/settings` persistence.

### Persistence Model
Prisma `SystemHealthConfig` singleton row (id=1) stores JSON thresholds + backupLocation + refreshInterval.
Fallback to in-memory defaults if DB unavailable.

### Threshold Schema Example
```
{
	latency: { warning: 400, critical: 800 },
	p95Latency: { warning: 500, critical: 1000 },
	errorRate: { warning: 1, critical: 5 },
	cacheHitRate: { warning: 90, critical: 80 },
	slowQueries: { warning: 5, critical: 10 },
	cpuUsage: { warning: 70, critical: 90 },
	memoryUsage: { warning: 80, critical: 95 }
}
```

### Series & Alerts
Short-term latency/error rate ring buffers (24 samples) kept in-memory (`latencyHistory`, `errorRateHistory`).
Alerts generated on request based on threshold evaluation (critical > warning). Future: persist & stream.

### Frontend
`SystemHealthDashboard.tsx` consumes new `/settings` endpoint for config editing and auto-refresh interval.

### Future Enhancements
- Durable metrics store & retention policy.
- WebSocket push for alerts.
- SLO tracking & monthly reports.
- Alert acknowledgment/resolution workflow.
- Prometheus adapter for real error rate + latency percentiles.

### Operational Notes
- Validation ensures `warning < critical` and sane refreshInterval (5s–5min).
- Backup path sanitized (blocks `..`, `~`).
- If DB down, PATCH updates only in-memory copy (log warns). Restart loses those changes.

## Final Production Readiness Additions (2025-11-24)

Recently completed hardening tasks:

- Persistent metrics models (`system_metric_samples`, `load_test_reports`) capture latency/error trends & load test outputs.
- Automatic per-request latency + error aggregation middleware (1‑min flush cycle).
- System Health endpoint now uses real sampled latency & error rate (last 24 samples) instead of static placeholder.
- Backup verification endpoint: `POST /api/system-health/backup/verify` validates latest backup presence & size.
- Load test ingestion endpoint: `POST /api/system-health/load-test` stores summarized k6 (or other) results for historical tracking.
- CSP audit script (`my-frontend/scripts/csp-audit.js`) flags inline script/style patterns before enabling strict CSP globally.
- Secure markdown rendering uses `marked` + `isomorphic-dompurify`; prior naive renderer replaced.

Remaining optional enhancements (future roadmap):

- Durable long-term metrics retention (partitioned daily table or external TSDB).
- WebSocket push channel for real-time alerts & metric deltas.
- Full SLA/SLO module (error budget burn rate, monthly availability reports).
- Automated integrity tests for backups (checksum verification & restore dry-run container).
- Prometheus integration for error counters to unify metrics source of truth.
- Alert acknowledgment workflow & escalation tiers (pager integration).

With these changes, core production readiness criteria (security, observability, configurability, resiliency) are in place. Proceed with a final migration baseline reconciliation before widespread rollout.
