-- Migration: Change user_id/senderId columns from INT to UUID
-- For Chat-related tables: threads, thread_members, thread_messages, call_logs, assistant_memory

-- Note: These tables have 0 rows so it's safe to alter types directly

-- 1. Drop indexes first (if they exist)
DROP INDEX IF EXISTS idx_thread_messages_sender;
DROP INDEX IF EXISTS idx_thread_messages_sender_created;
DROP INDEX IF EXISTS idx_assistant_memory_user;
DROP INDEX IF EXISTS idx_call_logs_initiator;

-- 2. Alter column types

-- threads: createdById from INT to UUID (nullable)
ALTER TABLE threads 
ALTER COLUMN "createdById" TYPE UUID USING "createdById"::text::uuid;

-- thread_members: userId from INT to UUID
ALTER TABLE thread_members 
ALTER COLUMN "userId" TYPE UUID USING "userId"::text::uuid;

-- thread_messages: senderId from INT to UUID
ALTER TABLE thread_messages 
ALTER COLUMN "senderId" TYPE UUID USING "senderId"::text::uuid;

-- call_logs: initiator_id from INT to UUID
ALTER TABLE call_logs 
ALTER COLUMN initiator_id TYPE UUID USING initiator_id::text::uuid;

-- assistant_memory: userId from INT to UUID
ALTER TABLE assistant_memory 
ALTER COLUMN "userId" TYPE UUID USING "userId"::text::uuid;

-- 3. Recreate indexes
CREATE INDEX IF NOT EXISTS idx_thread_messages_sender ON thread_messages ("senderId");
CREATE INDEX IF NOT EXISTS idx_thread_messages_sender_created ON thread_messages ("senderId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS idx_assistant_memory_user ON assistant_memory ("userId");
CREATE INDEX IF NOT EXISTS idx_call_logs_initiator ON call_logs (initiator_id);

-- 4. Create message_reactions table if not exists
CREATE TABLE IF NOT EXISTS message_reactions (
  id BIGSERIAL PRIMARY KEY,
  message_id VARCHAR(255) NOT NULL,
  user_id UUID NOT NULL,
  emoji VARCHAR(20) NOT NULL,
  created_at TIMESTAMP(6) DEFAULT NOW(),
  CONSTRAINT fk_message_reactions_message FOREIGN KEY (message_id) 
    REFERENCES thread_messages(id) ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT uq_message_reactions_unique UNIQUE (message_id, user_id, emoji)
);

CREATE INDEX IF NOT EXISTS idx_message_reactions_emoji ON message_reactions (emoji);
CREATE INDEX IF NOT EXISTS idx_message_reactions_message ON message_reactions (message_id);
CREATE INDEX IF NOT EXISTS idx_message_reactions_user ON message_reactions (user_id);

-- 5. Create message_reads table if not exists
CREATE TABLE IF NOT EXISTS message_reads (
  id BIGSERIAL PRIMARY KEY,
  message_id VARCHAR(255) NOT NULL,
  user_id UUID NOT NULL,
  read_at TIMESTAMP(6) DEFAULT NOW(),
  CONSTRAINT fk_message_reads_message FOREIGN KEY (message_id) 
    REFERENCES thread_messages(id) ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT uq_message_reads_unique UNIQUE (message_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_message_reads_message ON message_reads (message_id);
CREATE INDEX IF NOT EXISTS idx_message_reads_user ON message_reads (user_id);
CREATE INDEX IF NOT EXISTS idx_message_reads_user_date ON message_reads (user_id, read_at DESC);

-- Migration complete
