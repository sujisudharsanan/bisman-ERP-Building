# Client ID Service

Generates production-ready Client IDs (UUID v4 primary) with optional ULID, checksum, and HMAC signing.

Quick start

- Copy `.env.example` to `.env` and set secrets.
- npm install
- npm run dev

API

POST /api/client-ids
Headers: x-api-key OR Authorization: Bearer <jwt>
Body: { region?: "IN", format?: "uuid" | "ulid", signed?: boolean }
Response: { client_id, issued_at, region }

Security

- HMAC secret must be kept in a secrets manager in production.
- Do not log raw HMAC secrets. Logs record only a small hash prefix for auditing.

DB

- Create table `client_ids(client_id text primary key, region text, issued_at timestamptz)`
- Index: unique index on client_id

