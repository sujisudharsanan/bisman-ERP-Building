Client ID Service - BISMAN Backend Integration

Recommendation: perform client_id issuance on the server-side (BISMAN backend) during client creation.

Why server-side?
- Keeps HMAC secret and API keys out of the browser.
- Enables atomic DB transaction: generate id, insert client row with client_id (unique), store idempotency token -> avoids race conditions.

Example flow (Node.js / Express):

- Step 1: BISMAN backend receives create-client request from UI.
- Step 2: Backend requests a client_id from client-id-service using an internal API key and x-idempotency-token (optional).
- Step 3: Backend performs DB transaction: INSERT client row with returned client_id and other details.
- Step 4: If DB insert fails with duplicate client_id (very unlikely), backend retries issuance up to N times and then fails.

Code snippet (pseudo):

```js
const axios = require('axios');
async function createClient(req, res) {
  const idempotency = req.header('x-idempotency-token') || generateIdempotency();
  // request id from client-id-service
  const cidResp = await axios.post(process.env.CLIENT_ID_SERVICE + '/api/client-ids', { region: payload.country }, { headers: { 'x-api-key': process.env.CLIENT_ID_SERVICE_KEY, 'x-idempotency-token': idempotency } });
  const clientId = cidResp.data.client_id;

  // DB transaction: insert client row with client_id
  try {
    await db.tx(async t => {
      await t.none('INSERT INTO clients(client_id, name, ...) VALUES($1,$2,...)', [clientId, payload.name]);
      // other inserts
    });
  } catch (e) {
    // handle duplicate or retry
    throw e;
  }
}
```

Migration recommendation:
- `clients` table: add `client_id TEXT UNIQUE NOT NULL` and index it. Prefer primary key on internal numeric id and unique index on `client_id`.
- store idempotency_token table (already present in client-id-service).

Security:
- keep CLIENT_ID_SERVICE_KEY in your secrets manager; do not expose to frontend.
- use mTLS or internal VPC network for calls where possible.

