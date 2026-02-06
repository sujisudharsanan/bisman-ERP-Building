const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:JNdJhwkgAhtLbiGOFDEZZRGOtCvQumvd@hopper.proxy.rlwy.net:30204/railway' });

(async () => {
  try {
    // Check recent conversations
    const convs = await pool.query(`
      SELECT id, user_id, title, is_active, last_message_at, created_at
      FROM chat_conversations
      ORDER BY created_at DESC
      LIMIT 5
    `);
    console.log('Recent conversations:');
    console.table(convs.rows);
    
    // Check recent messages
    const msgs = await pool.query(`
      SELECT cm.id, cm.conversation_id, cm.user_id, cm.role, 
             SUBSTRING(cm.content, 1, 50) as content_preview,
             cm.created_at
      FROM chat_messages cm
      ORDER BY cm.created_at DESC
      LIMIT 10
    `);
    console.log('\nRecent messages:');
    console.table(msgs.rows);
    
  } catch (e) {
    console.error('Error:', e.message);
  }
  pool.end();
})();
