CREATE TABLE IF NOT EXISTS idempotency_tokens (
  token TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_idempotency_token_client ON idempotency_tokens(client_id);
