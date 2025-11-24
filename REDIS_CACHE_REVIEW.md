# Redis Cache Review

## Purpose
Provide an overview of current and planned Redis caching strategy for the BISMAN ERP platform, risks, observability, and actionable improvements before enforcing production scale traffic.

## Current / Assumed Usage
(Adjust after verification in codebase.)
- Session tokens / ephemeral auth (TTL short; e.g., 15–30 min)
- Rate limiting counters (hashed by user / IP / route key)
- AI chat context snippets (short-lived conversation slices for rapid retrieval)
- Presence / ephemeral call state (call rooms, participants list)
- Feature flags (potential, low write frequency)

## Key Design Principles
1. Deterministic Keys: Prefer structured keys: `<domain>:<subdomain>:<id>:<field>`
2. Explicit TTL: Every ephemeral key MUST define a TTL; persistent config keys excluded.
3. Namespacing: Separate prefixes to allow selective flush without global eviction.
4. Monitoring: Export cardinality + memory usage to Prometheus.
5. Hot Key Protection: Identify heavy keys and shard or split before they become bottlenecks.

## Proposed Namespaces & Keys
| Namespace Prefix | Example Key | Purpose | TTL | Notes |
|------------------|-------------|---------|-----|-------|
| auth:sess        | auth:sess:user:123 | Session metadata | 1800s | Rolling renewal on access |
| rl:global        | rl:global:minute | Global request counter | 60s | Used to short-circuit overload |
| rl:user          | rl:user:123:api:/calls | Per-user call route limit | 300s | Mirror limits in RATE_LIMIT_TUNING.md |
| chat:ctx         | chat:ctx:thread:987 | Recent messages slice | 120s | Stored as JSON string |
| call:room        | call:room:abc123:participants | Live participants set | 0 (ephemeral) | Use Set; expire on inactivity (key touches) |
| flags:config     | flags:config:darkMode | Feature flag state | 0 | Only change via admin panel |

## Data Structures Guidance
| Use Case | Recommended Structure | Justification |
|----------|-----------------------|---------------|
| Session | Hash (`HSET`) | Field updates atomic, easier partial reads |
| Rate Limits | Simple counters (`INCR`) or sliding window Lua | Low latency, straightforward |
| Chat context | List (`LPUSH`/`LTRIM`) or Sorted Set | Preserve order + prune efficiently |
| Call participants | Set (`SADD`/`SREM`) | Uniqueness of participants |
| Feature flags | String or Hash | Simple value or grouped flags |

## Observability Metrics (Prometheus Labels)
- redis_memory_bytes
- redis_connected_clients
- redis_commands_processed_total
- redis_keyspace_hits_total / redis_keyspace_misses_total
- app_cache_op_duration_seconds (Histogram: method, hit/miss)
- app_rate_limit_block_total (Counter: route, reason)

Add lightweight exporter or reuse existing Node Prometheus metrics with a Redis probe:
```js
// pseudo
const start = Date.now();
const v = await redis.get(key);
promCacheDuration.observe({method: 'get', hit: v ? 'hit':'miss'}, Date.now() - start);
```

## Hot Key / Cardinality Audit Procedure
1. Enable keyspace notifications temporarily (`config set notify-keyspace-events KEA`).
2. Sample `MONITOR` (short duration) during load test capturing top keys.
3. Export counts; identify keys with >5% of total ops.
4. Shard heavy keys (e.g., chat context by segmenting thread into windows: `chat:ctx:thread:<id>:w:<n>`).

## Eviction Policy
Recommended: `allkeys-lru` (if mixed persistent & ephemeral consider 2-instance split).
Memory guardrails:
- Set `maxmemory` with 65–75% of container/pod limit.
- Alert at 85% memory usage.
- Soft deletion: proactively trim lists (chat context) beyond set length (e.g., keep last 30 messages only if ephemeral in Redis).

## Failure & Degradation Modes
| Scenario | Impact | Mitigation |
|----------|--------|------------|
| Redis unavailable | Increased DB load, loss of rate limit enforcement | Fallback: in-memory counters (process-local) + circuit breaker, degrade gracefully |
| Key explosion (too many distinct keys) | Memory pressure | Introduce prefix hashing, reduce cardinality, scheduled pruning |
| Hot key lock contention | Latency spike | Use pipelining, Lua scripts for batching, shard key by suffix |
| Eviction of critical auth/session keys | Forced logouts | Separate instance / namespace with reserved memory |

## Actionable Improvements (Checklist)
- [ ] Confirm actual project Redis client initialization and wrap with standardized helper.
- [ ] Implement metrics wrappers for `get`, `set`, `incr`, `lua` scripts.
- [ ] Introduce structured key builder utility.
- [ ] Create rate limiter module (pluggable: Redis primary, memory fallback).
- [ ] Add integration test hitting rate limit boundaries.
- [ ] Load test (k6 or autocannon) with Redis metrics collection.
- [ ] Document operational runbooks (flush strategy, backup, failover).

## Key Builder Utility (Example)
```ts
// redisKeys.ts
export const redisKeys = {
  authSession: (userId: string) => `auth:sess:user:${userId}`,
  rateLimitUserRoute: (userId: string, route: string) => `rl:user:${userId}:api:${route}`,
  rateLimitGlobalMinute: () => `rl:global:minute:${Math.floor(Date.now()/60000)}`,
  chatThreadWindow: (threadId: string, window: number) => `chat:ctx:thread:${threadId}:w:${window}`,
  callRoomParticipants: (room: string) => `call:room:${room}:participants`,
};
```

## Deployment & Scaling Notes
- Use separate small Redis for ephemeral rate limiting to isolate from session storage (prevents eviction cascade).
- Consider enabling `CLIENT TRACKING` for server-side caching invalidation if adopting RESP3 features.
- Evaluate `redis-cluster` or Sentinel for HA once memory > 4GB or write ops > 50k/sec sustained.

## Runbook (Draft)
| Operation | Command | Note |
|-----------|---------|------|
| Flush ephemeral only | `EVAL "return redis.call('scan',0,'match','rl:*')"` (iterate + DEL) | Avoid `FLUSHALL` |
| Inspect top keys | `INFO keyspace` + `MEMORY USAGE <key>` | Combine with monitoring |
| Backup RDB manual | `BGSAVE` | Ensure persistence dir mounted |
| Failover (Sentinel) | `SENTINEL FAILOVER <master-name>` | Only if sentinel enabled |

## Next Steps
After verifying real code references, refine this doc replacing "Assumed Usage" with concrete modules and file paths.
