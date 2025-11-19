CREATE TABLE IF NOT EXISTS client_ids (
  client_id TEXT PRIMARY KEY,
  region TEXT,
  issued_at TIMESTAMPTZ DEFAULT now()
);
