# Redis Cache Integration Guide

## Folders
- `redisClient.js` client singleton, telemetry
- `namespaces.js` key prefixes
- `decorators/` generic wrappers
- `services/` cached service examples
- `invalidation/` event-driven removal
- `metrics/` hit/miss tracking

## Key Prefixes
`dash:core`, `report:monthly:v1`, `party:<id>`

## TTL Strategy
- Dashboard: 90s
- Reports: 3600s
- Party: 300s

## Invalidation
Use `invalidate(event, payload)` with events: `PARTY_UPDATED`, `PARTY_BULK_IMPORT`, etc. Bump version suffix for structural changes.

## Metrics Endpoint (to add)
Expose `/internal/cache-metrics` to view `{ hits, misses, hitRate }`.

## ISO/IEC 25010 Mapping
- Performance efficiency: reduced DB calls & latency
- Reliability: fail-open if Redis down
- Maintainability: modular separation
- Security: requires REDIS_URL password

## Next Steps
1. Set `REDIS_URL` in environment
2. Mount metrics & health endpoints in `app.js`
3. Wrap real services with decorators
4. Add invalidation calls after DB mutations
