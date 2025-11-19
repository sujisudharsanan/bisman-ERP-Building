# Client ID Persistence (Server-Side Integration)

This document explains how the BISMAN backend now integrates with the standalone `client-id-service` to generate and persist a stable `client_code` for newly created enterprise clients.

## Overview
When a client is created via `POST /api/system/clients`, the backend will:
1. Resolve `super_admin_id` robustly (matching prior logic).
2. Attempt to generate a client code using `CLIENT_ID_SERVICE_URL` (if configured).
3. Fall back to a UUID if the external service is unavailable.
4. Persist the resulting code in both the top-level `client_code` column (indexed & unique) and inside `settings.enterprise.client_code` for redundancy plus metadata flag.
5. Return `client_code` in the JSON response. Frontend can still supply `client_code` explicitly to override.

## Env Vars
Set these in your backend environment (e.g. `.env`):
```
CLIENT_ID_SERVICE_URL=https://client-id-service.internal
CLIENT_ID_SERVICE_KEY=your-api-key (optional if service requires)
```
If `CLIENT_ID_SERVICE_URL` is absent, generation falls back to `crypto.randomUUID()`.

## Request Flow
Frontend may omit `client_code`; backend will auto-generate:
```
POST /api/system/clients
{
  "legal_name": "Acme Industries Pvt. Ltd.",
  "primary_address": { "country": "IN", "line1": "Plot 8" },
  "primary_contact": { "name": "Ravi", "email": "ravi@acme.test", "phone": "+91-9876543210" },
  "adminUser": { "email": "admin@acme.test" }
}
```
Response:
```
201
{
  "success": true,
  "client_code": "c-8f3b8b37-9c0d-4f1e-a2e9-64c1b...",
  "data": { "id": "uuid", "client_code": "c-8f3b...", ... },
  "admin": { "id": 42, "email": "admin@acme.test", "username": "admin" },
  "tempPassword": "XyZ..." // when auto-provisioned
}
```

## Code Snippet
Excerpt from `src/routes/clientManagement.ts` (simplified):
```ts
async function fetchServerClientId(country?: string): Promise<string | null> {
  const base = process.env.CLIENT_ID_SERVICE_URL;
  if (!base) return null;
  const headers: any = { 'Content-Type': 'application/json' };
  if (process.env.CLIENT_ID_SERVICE_KEY) headers['x-api-key'] = process.env.CLIENT_ID_SERVICE_KEY;
  const resp = await fetch(`${base.replace(/\/$/, '')}/api/client-ids`, { method: 'POST', headers, body: JSON.stringify({ region: country, format: 'uuid', signed: false }) });
  if (!resp.ok) return null;
  const json = await resp.json().catch(() => ({}));
  return json.client_id || null;
}

// In POST /clients handler
let effectiveClientCode = body.client_code || await fetchServerClientId(primary_address?.country) || crypto.randomUUID();
```

## Single Client Fetch
A new endpoint provides retrieval of a single client:
```
GET /api/system/clients/:id
200 { success: true, data: { ...clientRecord } }
```
Use this for the new standalone edit page instead of relying on modal preloaded data.

## Error Handling
- Unique constraint collisions on `client_code` return 409 with a retry suggestion.
- External service failures are logged and silently fallback to UUID.

## Frontend Impact
- Creation modal will be replaced by a full page at `/system/clients/new`.
- Upon successful create, use returned `client_code` for follow-up operations (documents, permissions).
- Editing page `/system/clients/[id]/edit` will fetch via the new GET endpoint.

## Migration Notes
Existing clients without `client_code` remain valid. Consider running a backfill script if universal codes are required.

```bash
# Example backfill (pseudo-code)
UPDATE clients SET client_code = gen_random_uuid() WHERE client_code IS NULL;
```

## Next Steps
- Add background job to sync / verify codes.
- Add signed IDs support (set `signed: true` when service adds verification requirements).
- Introduce rate limiting for client creation.

---
Document version: 2025-11-17
"/>
