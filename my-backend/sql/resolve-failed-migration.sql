-- Resolve failed migration in Railway database
-- This migration failed because it tried to run while the database was in use
-- The tables might already exist, so we need to mark the migration as applied

-- Option 1: If tables DON'T exist, create them manually
CREATE TABLE IF NOT EXISTS threads (
  id text PRIMARY KEY,
  title varchar(200),
  created_by_id integer NOT NULL,
  created_at timestamp(6) with time zone DEFAULT now(),
  updated_at timestamp(6) with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_threads_creator ON threads (created_by_id);

CREATE TABLE IF NOT EXISTS thread_members (
  id text PRIMARY KEY,
  thread_id text NOT NULL,
  user_id integer NOT NULL,
  role varchar(50) NOT NULL DEFAULT 'member',
  joined_at timestamp(6) with time zone DEFAULT now(),
  left_at timestamp(6) with time zone NULL,
  is_active boolean NOT NULL DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_thread_members_user ON thread_members (user_id);
CREATE INDEX IF NOT EXISTS idx_thread_members_thread ON thread_members (thread_id);
CREATE INDEX IF NOT EXISTS idx_thread_members_role ON thread_members (role);

-- Add unique constraint if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_thread_members_thread_user'
  ) THEN
    ALTER TABLE thread_members ADD CONSTRAINT uq_thread_members_thread_user UNIQUE (thread_id, user_id);
  END IF;
END $$;

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
CREATE INDEX IF NOT EXISTS idx_call_logs_status ON call_logs (status);
CREATE INDEX IF NOT EXISTS idx_call_logs_started ON call_logs (started_at);

-- Option 2: Mark migration as resolved in _prisma_migrations table
-- This tells Prisma the migration was applied successfully
UPDATE _prisma_migrations
SET 
  finished_at = NOW(),
  applied_steps_count = (
    SELECT COUNT(*) 
    FROM regexp_split_to_table(
      (SELECT migration_name FROM _prisma_migrations WHERE migration_name = '20251119_add_thread_members_and_call_logs'),
      '\n'
    )
  ),
  logs = 'Migration manually resolved - tables created via SQL script'
WHERE migration_name = '20251119_add_thread_members_and_call_logs'
  AND finished_at IS NULL;

-- Verify the fix
SELECT 
  migration_name,
  finished_at,
  applied_steps_count,
  started_at
FROM _prisma_migrations
WHERE migration_name = '20251119_add_thread_members_and_call_logs';
