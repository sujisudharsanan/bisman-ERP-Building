# feat(chat): i18n wiring, presence, type-check + accessibility fixes

## Summary
- Wired UI strings to next-i18next (common namespace).
- Added presence heartbeat via Socket.IO and persisted last_seen_at to thread_members.
- Ensured non-interrupting scroll behavior and added base test.
- Added RBAC role gating for call start/join (backend) and tests.
- Added translation files for en, hi, es, fr, zh.

## How to test
1. Install deps: `npm ci` in frontend & backend.
2. Start backend with socket server.
3. Run seed: `node prisma/seed.ts` (ensure proper env guards).
4. Open app; login as two different demo users; observe presence dot.
5. Start a call as allowed role; attempt start/join with disallowed role (expect 403).
6. Scroll up in chat, send messages from other user; verify scroll doesn't jump.

## Checklist
- [ ] Type-check passing (`npm run type-check`)
- [ ] Lint passing (`npm run lint`)
- [ ] Build passing (`npm run build`)
- [ ] Backend jest tests passing
- [ ] Presence events show within 45s threshold
- [ ] RBAC: non-member & banned roles blocked (403)
- [ ] i18n strings render for selected locale

## Screenshots
_Add before/after UI screenshots here._

## Notes
- Presence assumes socket sticky sessions if deployed behind a load balancer.
- Consider Redis adapter for horizontal scaling.
