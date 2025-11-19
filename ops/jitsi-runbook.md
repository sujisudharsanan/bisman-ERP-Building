# Jitsi Calls: Deployment & Runbook

## Variables
- JITSI_DOMAIN=jitsi.internal.example
- JITSI_PUBLIC_URL=https://jitsi.internal.example
- JITSI_JWT_SECRET=REPLACE
- JITSI_APP_ID=erp-calls
- TURN_HOST=turn.internal.example
- TURN_USERNAME=REPLACE
- TURN_PASSWORD=REPLACE
- JIBRI_HOST=jibri.internal.example (optional)

## Staging rollout
1) Apply CSP header:
   - Use `ops/jitsi-csp-staging.txt` on reverse proxy/app headers.
   - Verify with curl and browser console script in the file.
2) DB migration:
   - In dev: npx prisma migrate dev --name add_thread_members_and_call_logs
   - In staging: npx prisma migrate deploy
3) Backend config:
   - Set env vars above; restart backend.
   - Smoke test health: GET /api/calls/health/jitsi, /api/calls/health/coturn
4) Frontend deploy:
   - Ensure CSP in next.config.js pins JITSI and TURN.
   - Build and deploy frontend.

## Operations
- Start call: POST /api/calls/start {thread_id, call_type}
- Join call: POST /api/calls/:id/join
- End call: POST /api/calls/:id/end
- Get log: GET /api/calls/:id/log

## Rollback
- Feature flag UI: hide call controls via env (NEXT_PUBLIC_ENABLE_CALLS=false).
- Revert CSP to previous allowlist.
- DB rollback (manual):
  - DROP TABLE call_logs;
  - DROP TABLE thread_members;
  - DROP TABLE threads;
  - Or apply generated down migration script if available.

## Monitoring
- Health endpoints: /api/calls/health/jitsi, /api/calls/health/coturn
- Metrics to watch:
  - JVB CPU/mem, participants per conference, packet loss, RTT
  - App errors: failed_to_start_call, not_a_thread_member, forbidden
  - Join failures over time

## Security checklist
- TLS for app and Jitsi; WSS only.
- Short-lived JWT (<=60s) for join.
- Consent modal before recording; store consent_recorded on call_logs.
- RBAC: only thread_members; moderator/admin or initiator can end.
- Encrypt recordings/transcripts at rest.

## Tests & QA
- E2E: start → notify → join → leave → end → check call_logs persisted with duration.
- NAT/ICE fallback: block STUN to force TURN, validate call stays connected.
- Load: simulate N participants across rooms; watch JVB metrics.
