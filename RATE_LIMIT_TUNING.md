# Rate Limit Tuning Guide

## Current Configuration (Summary)
- Login limiter: 10 attempts / 15 min in production.
- General API limiter: 100 requests / 5 min in production.

## Objectives
1. Protect authentication endpoints against brute force.
2. Prevent abuse of chat/calls and AI endpoints.
3. Maintain acceptable UX (avoid false positives for normal usage).

## Recommended Adjustments
| Endpoint Group | Suggested Window | Suggested Max | Notes |
|----------------|------------------|---------------|-------|
| /api/auth/* (login) | 15m | 8 | Lower for stricter brute-force protection |
| /api/calls/* | 5m | 50 | Calls create/join/end events |
| /api/chat/* or /api/ai/* | 1m | 30 | High-frequency chat requests |
| /api/* (default) | 5m | 300 | General browsing/API usage |

## Implementation Pattern
Use separate limiters per router group:
```js
const makeLimiter = (max, windowMs) => rateLimit({ windowMs, max, standardHeaders: true, legacyHeaders: false });
app.use('/api/auth', makeLimiter(8, 15 * 60 * 1000));
app.use('/api/calls', makeLimiter(50, 5 * 60 * 1000));
app.use('/api/chat', makeLimiter(30, 60 * 1000));
app.use('/api/ai', makeLimiter(30, 60 * 1000));
app.use('/api', makeLimiter(300, 5 * 60 * 1000));
```
Order matters: mount specific prefixes before generic `/api` to avoid over limiting.

## Staging Test Plan
1. Simulate bursts: `hey -n 40 -c 10 http://localhost:3001/api/auth/login` (expect throttling after threshold).
2. Chat flood: script 35 requests in 60s to `/api/chat/send` – last 5 should 429.
3. Ensure legitimate usage (navigation + AJAX) stays below thresholds (instrument logs).
4. Prometheus: create alert for >20% 429 responses over 5 minutes.

## Monitoring Metrics
Track:
- 429 response count per limiter.
- Unique IPs hitting 429.
- Latency impact (ensure limiter not causing bottleneck).

## Alerting Thresholds
| Metric | Condition | Action |
|--------|-----------|--------|
| Auth 429 spike | >50 in 10m | Investigate potential attack, temporarily lower max |
| Chat 429 sustained | >500 in 30m | Consider raising limit if legitimate peak |
| Generic API 429 | >5% of total responses over 15m | Evaluate UX impact |

## Production Rollout
1. Deploy updated limiters in canary environment.
2. Monitor 48h.
3. Adjust thresholds if false positives >1% of sessions.
4. Tag release notes with limiter changes.

## Backoff Strategy
On excessive 429s for a client: instruct UI to exponential backoff (1s, 2s, 4s) before retry.

## Future Enhancements
- Redis backed distributed rate limits.
- Dynamic adjustment based on current server load.
- Per-user & per-IP hybrid limiting.

Generated: 2025-11-24
