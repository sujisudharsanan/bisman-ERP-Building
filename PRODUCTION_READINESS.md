# Production Readiness Checklist

## Security
- Require JITSI_JWT_SECRET >= 32 chars in production (health endpoint enforces)
- Seed script guarded by ALLOW_DEMO_SEED flag; passwords hashed with bcrypt
- CSP pinned to Jitsi + TURN hosts; frame-ancestors none except /chat scope uses SAMEORIGIN
- Permissions-Policy restricts camera/mic usage; expand only where needed
- Upgrade-Insecure-Requests enabled

## Calls Lifecycle
- Start: persists callLog if DB available; emits socket event
- Join: RBAC via threadMember lookup; ICE servers sourced from env TURN_HOST/TURN_USERNAME/TURN_PASSWORD
- End: Persists ended_at + duration_seconds; emits ended event
- Log: DB preferred; fallback to in-memory for resiliency

## Environment Variables
| Variable | Purpose | Required Prod |
|----------|---------|---------------|
| DATABASE_URL | Postgres connection | yes |
| JITSI_JWT_SECRET | Sign Jitsi room JWT | yes |
| JITSI_DOMAIN | Internal Jitsi domain | yes |
| JITSI_PUBLIC_HOST | Public host for CSP | yes |
| TURN_HOST | TURN server host | yes |
| TURN_USERNAME | TURN auth username | yes |
| TURN_PASSWORD | TURN auth credential | yes |
| DEMO_USER_PASSWORD | Demo seed password (hashed) | optional dev |
| ALLOW_DEMO_SEED | Allow demo seed in prod | no (default) |

## Operational
- Health endpoints: /api/calls/health/jitsi and /api/calls/health/coturn
- Runbook: ops/jitsi-runbook.md
- CSP artifact: ops/jitsi-csp-staging.txt

## Testing & Validation
- Jest suite (calls) passing; add integration tests for OTP flow separately
- Frontend type-check executed (no reported compile errors)

## Deployment Steps
1. Set required env vars.
2. Run prisma migrate deploy.
3. Start backend with start:deploy (auto generate client).
4. Seed only if ALLOW_DEMO_SEED=true (temporary staging).
5. Verify health endpoints and CSP headers.

## Future Hardening
- Add rate limits per call start and join
- Add metrics (Prometheus) for active calls, participants, avg duration
- Replace unsafe-inline style once legacy inline CSS removed

