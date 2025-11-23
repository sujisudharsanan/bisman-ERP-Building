# Chat Features Smoke Test Checklist

## Pre-requisites
- Backend running with Socket.IO presence module loaded.
- Seeded demo data (users & threads).
- Environment variables set: JITSI_DOMAIN, JITSI_JWT_SECRET (prod), TURN_HOST.

## Steps
1. Login as User A and User B in separate browsers/incognito.
2. Verify presence dot for each user appears within 5s (green) when active.
3. User A opens chat, scrolls up several pages of messages.
4. User B sends 5 new messages.
   - Expect: User A viewport unchanged; optional new messages indicator (future enhancement).
5. User A scrolls to bottom.
   - Send another message from User B.
   - Expect: Auto-scroll to newest message.
6. Start audio call as Admin role.
   - Observe call banner & Jitsi iframe loads after join.
7. Attempt call start with disallowed role (e.g., STAFF if not in initiator allowlist).
   - Expect: 403 response.
8. Attempt join with banned/suspended role (if fixture present).
   - Expect: 403 response.
9. Switch locale (e.g., to `es`).
   - Verify chat placeholder, buttons, status text translated.
10. Accessibility quick check:
    - Tab through controls (attachment, emoji, send) -> focus outline visible.
    - Screen reader announces online/offline statuses.

## Post-test
- Run `npm run type-check`, `npm run lint`, `npm run build`.
- Run backend Jest tests.

## Metrics to watch (optional)
- Socket connection count.
- Presence heartbeat latency.
- Call start/join error rate.
