/**
 * Seed Copilate Knowledge Base
 * Add common intents and responses for the chat bot
 */

const { Client } = require('pg');

async function seedCopilateKnowledge() {
  console.log('🤖 Seeding Copilate Knowledge Base...');

  const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres@localhost:5432/BISMAN'
  });

  try {
    await client.connect();

    // Get super admin user (or first user) to set as creator
    const userResult = await client.query(`
      SELECT id FROM users WHERE username LIKE '%super%' OR username LIKE '%admin%' LIMIT 1
    `);

    if (userResult.rows.length === 0) {
      console.error('❌ No users found. Please seed users first.');
      return;
    }

    const creatorId = userResult.rows[0].id;

    // Knowledge base entries
    const knowledgeEntries = [
      {
        intent: 'search_user',
        keywords: ['find', 'search', 'user', 'who', 'person', 'locate'],
        reply_template: 'Found {{count}} user{{plural}} matching "{{query}}".',
        requires_rbac: false,
        required_permissions: [],
        requires_confirmation: false,
        category: 'user_management',
        priority: 5,
        created_by: creatorId
      },
      {
        intent: 'find_user',
        keywords: ['find', 'search', 'lookup', 'who is'],
        reply_template: 'Searching for user: {{query}}',
        requires_rbac: false,
        required_permissions: [],
        requires_confirmation: false,
        category: 'user_management',
        priority: 5,
        created_by: creatorId
      },
      {
        intent: 'show_pending_tasks',
        keywords: ['pending', 'tasks', 'approvals', 'waiting'],
        reply_template: 'You have {{count}} pending task{{plural}} for approval.',
        requires_rbac: true,
        required_permissions: ['view_approvals'],
        requires_confirmation: false,
        category: 'tasks',
        priority: 10,
        created_by: creatorId
      },
      {
        intent: 'show_payment_requests',
        keywords: ['payment', 'requests', 'payments', 'show payments'],
        reply_template: 'You have {{count}} payment request{{plural}}.',
        requires_rbac: true,
        required_permissions: ['view_payments'],
        requires_confirmation: false,
        category: 'payments',
        priority: 10,
        created_by: creatorId
      },
      {
        intent: 'show_dashboard',
        keywords: ['dashboard', 'overview', 'summary', 'home'],
        reply_template: 'Here is your dashboard overview.',
        requires_rbac: false,
        required_permissions: [],
        requires_confirmation: false,
        category: 'navigation',
        priority: 8,
        created_by: creatorId
      },
      {
        intent: 'show_notifications',
        keywords: ['notifications', 'alerts', 'messages', 'updates'],
        reply_template: 'You have {{count}} unread notification{{plural}}.',
        requires_rbac: false,
        required_permissions: [],
        requires_confirmation: false,
        category: 'notifications',
        priority: 7,
        created_by: creatorId
      },
      {
        intent: 'greeting',
        keywords: ['hello', 'hi', 'hey', 'good morning', 'good afternoon'],
        reply_template: 'Hello! How can I assist you today?',
        requires_rbac: false,
        required_permissions: [],
        requires_confirmation: false,
        category: 'general',
        priority: 1,
        created_by: creatorId
      },
      {
        intent: 'help',
        keywords: ['help', 'assist', 'support', 'how do i', 'what can you'],
        reply_template: 'I can help you with:\n• Show pending tasks\n• Show payment requests\n• Find users\n• Show dashboard\n• Show notifications',
        requires_rbac: false,
        required_permissions: [],
        requires_confirmation: false,
        category: 'general',
        priority: 2,
        created_by: creatorId
      }
    ];

    // Insert each entry
    for (const entry of knowledgeEntries) {
      // Check if exists
      const existingResult = await client.query(
        'SELECT id FROM knowledge_base WHERE intent = $1 LIMIT 1',
        [entry.intent]
      );

      if (existingResult.rows.length > 0) {
        console.log(`⚠️  Intent "${entry.intent}" already exists, skipping...`);
        continue;
      }

      // Insert knowledge entry
      await client.query(
        `INSERT INTO knowledge_base (
          intent, keywords, reply_template, requires_rbac, 
          required_permissions, requires_confirmation, category, 
          priority, created_by, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`,
        [
          entry.intent,
          JSON.stringify(entry.keywords),
          entry.reply_template,
          entry.requires_rbac,
          JSON.stringify(entry.required_permissions),
          entry.requires_confirmation,
          entry.category,
          entry.priority,
          entry.created_by
        ]
      );

      console.log(`✅ Added knowledge entry: ${entry.intent}`);
    }

    // Add bot configuration
    const configs = [
      { key: 'confidence_threshold_high', value: '0.90' },
      { key: 'confidence_threshold_low', value: '0.80' },
      { key: 'auto_promote_enabled', value: 'false' },
      { key: 'auto_promote_threshold', value: '5' },
      { key: 'learning_enabled', value: 'true' },
      { key: 'rbac_enabled', value: 'true' },
      { key: 'ai_enabled', value: 'true' }
    ];

    for (const config of configs) {
      const existingConfig = await client.query(
        'SELECT key FROM bot_config WHERE key = $1 LIMIT 1',
        [config.key]
      );

      if (existingConfig.rows.length > 0) {
        console.log(`⚠️  Config "${config.key}" already exists, skipping...`);
        continue;
      }

      await client.query(
        'INSERT INTO bot_config (key, value, created_at) VALUES ($1, $2, NOW())',
        [config.key, config.value]
      );

      console.log(`✅ Added bot config: ${config.key} = ${config.value}`);
    }

    console.log('✅ Copilate Knowledge Base seeded successfully!');

  } catch (error) {
    console.error('❌ Error seeding Copilate knowledge:', error);
    throw error;
  } finally {
    await client.end();
  }
}

// Run if called directly
if (require.main === module) {
  seedCopilateKnowledge()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { seedCopilateKnowledge };
