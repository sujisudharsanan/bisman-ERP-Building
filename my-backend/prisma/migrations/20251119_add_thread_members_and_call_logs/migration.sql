-- Prisma migration: add_thread_members_and_call_logs
-- Generated on 2025-11-19 UTC

-- THREADS
CREATE TABLE IF NOT EXISTS threads (
  id text PRIMARY KEY,
  title varchar(200),
  created_by_id integer NOT NULL,
  created_at timestamp(6) with time zone DEFAULT now(),
  updated_at timestamp(6) with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_threads_creator ON threads (created_by_id);

-- THREAD MEMBERS
CREATE TABLE IF NOT EXISTS thread_members (
  id text PRIMARY KEY,
  thread_id text NOT NULL,
  user_id integer NOT NULL,
  role varchar(50) NOT NULL DEFAULT 'member',
  joined_at timestamp(6) with time zone DEFAULT now(),
  left_at timestamp(6) with time zone NULL,
  is_active boolean NOT NULL DEFAULT true
);

ALTER TABLE thread_members ADD CONSTRAINT uq_thread_members_thread_user UNIQUE (thread_id, user_id);
CREATE INDEX IF NOT EXISTS idx_thread_members_user ON thread_members (user_id);
CREATE INDEX IF NOT EXISTS idx_thread_members_thread ON thread_members (thread_id);
CREATE INDEX IF NOT EXISTS idx_thread_members_role ON thread_members (role);

-- CALL LOGS
CREATE TABLE IF NOT EXISTS call_logs (
  id text PRIMARY KEY,
  room_name varchar(255) NOT NULL,
  thread_id text NOT NULL,
  initiator_id integer NOT NULL,
  call_type varchar(20) NOT NULL DEFAULT 'audio',
  status varchar(30) NOT NULL DEFAULT 'ringing',
  started_at timestamp(6) with time zone DEFAULT now(),
  ended_at timestamp(6) with time zone NULL,
  duration_seconds integer DEFAULT 0,
  participants jsonb,
  recording_url text,
  transcript_url text,
  quality_metrics jsonb,
  consent_recorded boolean NOT NULL DEFAULT false,
  created_at timestamp(6) with time zone DEFAULT now(),
  updated_at timestamp(6) with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_call_logs_thread ON call_logs (thread_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_initiator ON call_logs (initiator_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_room ON call_logs (room_name);
CREATE INDEX IF NOT EXISTS idx_call_logs_status ON call_logs (status);
CREATE INDEX IF NOT EXISTS idx_call_logs_started ON call_logs (started_at);

-- FKs
ALTER TABLE threads
  ADD CONSTRAINT fk_threads_created_by
  FOREIGN KEY (created_by_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE thread_members
  ADD CONSTRAINT fk_thread_members_thread
  FOREIGN KEY (thread_id) REFERENCES threads(id) ON DELETE CASCADE;

ALTER TABLE thread_members
  ADD CONSTRAINT fk_thread_members_user
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE call_logs
  ADD CONSTRAINT fk_call_logs_thread
  FOREIGN KEY (thread_id) REFERENCES threads(id) ON DELETE CASCADE;

ALTER TABLE call_logs
  ADD CONSTRAINT fk_call_logs_initiator
  FOREIGN KEY (initiator_id) REFERENCES users(id) ON DELETE SET NULL;

-- Trigger to maintain updated_at (optional; Prisma @updatedAt also handles this in app layer)
-- CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
-- BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql;
-- CREATE TRIGGER trg_threads_updated BEFORE UPDATE ON threads FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
-- CREATE TRIGGER trg_call_logs_updated BEFORE UPDATE ON call_logs FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
