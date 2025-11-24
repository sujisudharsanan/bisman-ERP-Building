-- Manual bootstrap for chat & calls tables when Prisma migration conflicts block normal deploy.
-- Apply with: psql $DATABASE_URL -f migrations/manual-bootstrap-chat-calls.sql

CREATE TABLE IF NOT EXISTS thread_members (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id VARCHAR(64) NOT NULL,
  user_id INT NOT NULL,
  role VARCHAR(50) DEFAULT 'member',
  joined_at TIMESTAMPTZ DEFAULT now(),
  left_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  CONSTRAINT uq_thread_member_thread_user UNIQUE (thread_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_thread_members_user ON thread_members(user_id);
CREATE INDEX IF NOT EXISTS idx_thread_members_thread ON thread_members(thread_id);
CREATE INDEX IF NOT EXISTS idx_thread_members_role ON thread_members(role);

CREATE TABLE IF NOT EXISTS call_logs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  room_name VARCHAR(255) NOT NULL,
  thread_id VARCHAR(64) NOT NULL,
  initiator_id INT NOT NULL,
  call_type VARCHAR(20) DEFAULT 'audio',
  status VARCHAR(30) DEFAULT 'ringing',
  started_at TIMESTAMPTZ DEFAULT now(),
  ended_at TIMESTAMPTZ,
  duration_seconds INT DEFAULT 0,
  participants JSONB,
  recording_url TEXT,
  transcript_url TEXT,
  quality_metrics JSONB,
  consent_recorded BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_call_logs_thread ON call_logs(thread_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_initiator ON call_logs(initiator_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_room ON call_logs(room_name);
CREATE INDEX IF NOT EXISTS idx_call_logs_status ON call_logs(status);
CREATE INDEX IF NOT EXISTS idx_call_logs_started ON call_logs(started_at);

-- NOTE: Foreign keys intentionally omitted due to potential legacy data issues.
-- Add later once baseline is stable:
-- ALTER TABLE call_logs ADD CONSTRAINT fk_call_logs_initiator FOREIGN KEY (initiator_id) REFERENCES users(id) ON DELETE SET NULL;
-- ALTER TABLE thread_members ADD CONSTRAINT fk_thread_members_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
