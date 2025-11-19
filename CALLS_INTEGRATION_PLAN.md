# Internal Jitsi Group Calling Integration (Chat)

Goal: Fully internal, production-ready Jitsi (self-hosted) group audio/video calling within ERP chat threads.

## Architecture Overview
- Jitsi stack (docker-jitsi-meet): prosody (XMPP), jicofo (control), jvb (SFU), web container.
- Coturn TURN server (separate host) for NAT traversal with long-term credentials.
- ERP Backend (Node/Express):
  - REST: POST /api/calls/start, POST /api/calls/:id/join, POST /api/calls/:id/end, GET /api/calls/:id/log
  - JWT issuer for short-lived join tokens (room_name, user_id, exp).
  - Webhooks (HMAC-signed): call.started/joined/left/ended/recording.ready
  - Telemetry events to Datadog/Prometheus.
- ERP Frontend (Next.js): Chat UI with call icons, in-chat banner, and Jitsi External API iframe.

## .env defaults (docker-jitsi-meet)
```
# Jitsi
PUBLIC_URL=https://jitsi.internal.example
ENABLE_AUTH=1
AUTH_TYPE=jwt
JWT_APP_ID=erp-calls
JWT_APP_SECRET="replace_with_strong_secret"
ENABLE_LOBBY=1
ENABLE_RECORDING=1
JIBRI_BREWERY_MUC=jibribrewery
JIBRI_PENDING_TIMEOUT=90
# TURN
TURN_HOST=turn.internal.example
TURN_PORT=3478
TURN_TRANSPORT=udp
TURN_SECRET="replace_with_long_random"
# Prosody connection security
TZ=UTC
``` 

## TURN (coturn) sample (turnserver.conf)
```
listening-port=3478
min-port=49152
max-port=65535
fingerprint
lt-cred-mech
use-auth-secret
static-auth-secret=REPLACE_LONG_RANDOM
realm=internal.example
server-name=erp-coturn
no-cli
no-loopback-peers
no-multicast-peers
cert=/etc/letsencrypt/live/turn.internal.example/fullchain.pem
pkey=/etc/letsencrypt/live/turn.internal.example/privkey.pem
``` 

## JWT issuance example (Node)
```js
const jwt = require('jsonwebtoken');
function issueJitsiJwt({ room, userId, displayName, ttlSec=90 }){
  const now = Math.floor(Date.now()/1000);
  const payload = {
    aud: 'jitsi', iss: process.env.JWT_APP_ID || 'erp-calls', sub: 'jitsi.internal.example',
    room,
    exp: now + ttlSec,
    nbf: now - 5,
    context: { user: { id: userId, name: displayName } }
  };
  return jwt.sign(payload, process.env.JWT_APP_SECRET, { algorithm: 'HS256' });
}
```

## REST endpoints (Node/Express pseudocode)
```js
router.post('/start', auth, rbac('call.create'), async (req,res)=>{
  const { thread_id, call_type='audio' } = req.body;
  const room = `erp-${thread_id}-${crypto.randomUUID()}`;
  const rec = await db.call_logs.create({ room_name: room, thread_id, initiator_id: req.user.id, call_type, status:'ringing', started_at: new Date() });
  telemetry.emit('call.started', { call_id: rec.id, thread_id, initiator_id: req.user.id, call_type });
  ws.notifyThread(thread_id, { event:'call.started', data:{ call_id: rec.id, room, call_type }});
  webhooks.deliver('call.started', rec);
  res.json({ call_id: rec.id, room_name: room, join_url: `${process.env.PUBLIC_URL}/${room}` });
});

router.post('/:id/join', auth, async (req,res)=>{
  const call = await db.call_logs.findById(req.params.id);
  if (!call) return res.status(404).json({ error:'not_found' });
  if (!membership.isInThread(req.user.id, call.thread_id)) return res.status(403).json({ error:'forbidden' });
  const token = issueJitsiJwt({ room: call.room_name, userId: req.user.id, displayName: req.user.name });
  await db.call_logs.pushParticipant(call.id, { user_id: req.user.id, joined_at: new Date(), role:'participant', device_info: parseUA(req) });
  telemetry.emit('call.joined', { call_id: call.id, user_id: req.user.id });
  webhooks.deliver('call.joined', { call_id: call.id, user_id: req.user.id });
  res.json({ token, jitsi_config: { domain: process.env.JITSI_DOMAIN, room: call.room_name } });
});

router.post('/:id/end', auth, rbac('call.moderate'), async (req,res)=>{
  const call = await db.call_logs.findById(req.params.id);
  if (!call) return res.status(404).json({ error:'not_found' });
  const ended = await db.call_logs.end(call.id, { ended_at: new Date(), status:'completed' });
  telemetry.emit('call.ended', { call_id: call.id }); webhooks.deliver('call.ended', ended);
  res.json({ ok:true });
});

router.get('/:id/log', auth, async (req,res)=>{
  const log = await db.call_logs.findById(req.params.id);
  if (!log) return res.status(404).json({ error:'not_found' });
  res.json(log);
});
```

## SQL DDL (Postgres)
See `db/call_logs.sql` in repo; includes indexes and retention.

## Frontend components
- CallIcons: header/composer icons with aria-labels and tooltips.
- CallBanner: in-chat banner with status, participants, Join/Leave, End, Share.
- JitsiFrame: wrapper around JitsiMeetExternalAPI with events bridged to chat state.
- I18n files: i18n/en.json, es.json, fr.json, hi.json, zh.json.

## Observability
- Emit structured events in backend; expose `/health/jitsi` and `/health/coturn`.
- Capture latency/participant metrics; export Prometheus counters/gauges.

## Testing & QA
- E2E flows (ring/accept/decline), NAT/TURN fallback, load test SFU.
- Acceptance checklist appended at end of doc.

## Ops Checklist
- Deploy Jitsi & TURN with TLS, DNS, JWT configured.
- Configure retention & storage policy for recordings/transcripts.
- Monitoring/alerts in place; runbooks for restart/rotate/scale.
