// Auto-bootstrap missing chat/call related tables if they do not exist.
// Safe idempotent creation via IF NOT EXISTS checks. Enable with AUTO_BOOTSTRAP_CHAT_CALLS=1
// Intended for staging/dev environments only; production should use proper migrations.

const { Pool } = require('pg');

async function bootstrap() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.warn('[bootstrapChatCallsTables] DATABASE_URL missing; skipping');
    return;
  }
  const pool = new Pool({ connectionString: url });
  try {
    const client = await pool.connect();
    try {
      console.log('[bootstrapChatCallsTables] Checking chat/calls tables...');
      const ddl = `
      CREATE TABLE IF NOT EXISTS thread_members (
        id SERIAL PRIMARY KEY,
        thread_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(thread_id, user_id)
      );
      CREATE INDEX IF NOT EXISTS idx_thread_members_thread ON thread_members(thread_id);
      CREATE INDEX IF NOT EXISTS idx_thread_members_user ON thread_members(user_id);

      CREATE TABLE IF NOT EXISTS call_logs (
        id SERIAL PRIMARY KEY,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        started_at TIMESTAMP WITH TIME ZONE,
        ended_at TIMESTAMP WITH TIME ZONE,
        thread_id INTEGER,
        host_user_id INTEGER,
        status TEXT,
        duration_seconds INTEGER,
        participants JSONB DEFAULT '[]'::jsonb
      );
      CREATE INDEX IF NOT EXISTS idx_call_logs_thread ON call_logs(thread_id);
      CREATE INDEX IF NOT EXISTS idx_call_logs_host ON call_logs(host_user_id);
      `;
      await client.query(ddl);
      console.log('[bootstrapChatCallsTables] ✅ Ensured thread_members & call_logs');
    } finally {
      client.release();
    }
  } catch (e) {
    console.error('[bootstrapChatCallsTables] Bootstrap failed:', e.message);
  } finally {
    await pool.end();
  }
}

module.exports = { bootstrap };

if (require.main === module) {
  bootstrap().then(() => process.exit(0));
}
