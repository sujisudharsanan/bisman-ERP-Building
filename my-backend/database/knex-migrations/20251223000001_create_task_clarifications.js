/**
 * Migration: Create task_clarifications table for cross-user/cross-department clarification
 * 
 * Key Features:
 * - Request clarification from any user or department WITHOUT changing task ownership
 * - Pause SLA during clarification (configurable)
 * - Full audit trail for compliance
 * - Limit concurrent clarifications
 * - Automatic task resume after response
 * 
 * Rules:
 * - Clarification is read-only for the responder
 * - Task ownership and approval chain remain unchanged
 * - No approval, reassignment, or escalation through clarification
 */

exports.up = async function(knex) {
  // First, add the WAITING_FOR_CLARIFICATION status to the task_status enum
  const isPostgres = knex.client.config.client === 'pg' || knex.client.config.client === 'postgresql';
  
  if (isPostgres) {
    // Add new status value to enum if it doesn't exist
    await knex.raw(`
      DO $$ BEGIN
        ALTER TYPE task_status ADD VALUE IF NOT EXISTS 'WAITING_FOR_CLARIFICATION';
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
  }

  // Create clarification_status enum
  if (isPostgres) {
    await knex.raw(`
      DO $$ BEGIN
        CREATE TYPE clarification_status AS ENUM (
          'pending',
          'responded',
          'expired',
          'cancelled'
        );
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
  }

  // Create task_clarifications table
  const tableExists = await knex.schema.hasTable('task_clarifications');
  
  if (!tableExists) {
    await knex.schema.createTable('task_clarifications', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      
      // Reference to the task
      table.integer('task_id').notNullable().references('id').inTable('workflow_tasks').onDelete('CASCADE');
      table.uuid('tenant_id').nullable();
      
      // Who is requesting clarification (no FK - users view is not a table)
      table.integer('requester_id').notNullable();
      table.string('requester_name', 255).nullable(); // Denormalized for faster queries
      table.string('requester_department', 100).nullable();
      
      // Who should respond (user or department) - no FK constraints
      table.integer('responder_id').nullable();
      table.string('responder_department_id', 100).nullable(); // If targeting a department instead of user
      table.string('responder_name', 255).nullable(); // Denormalized
      table.string('responder_type').notNullable().defaultTo('user'); // 'user' or 'department'
      
      // Clarification question/request
      table.text('question').notNullable();
      table.jsonb('attachments').nullable(); // Array of attachment objects [{id, name, url, type}]
      
      // Clarification response
      table.text('response').nullable();
      table.jsonb('response_attachments').nullable();
      table.integer('responded_by_id').nullable(); // No FK - users view is not a table
      table.string('responded_by_name', 255).nullable();
      table.timestamp('responded_at').nullable();
      
      // Status tracking
      table.string('status', 50).notNullable().defaultTo('pending');
      // Status: 'pending', 'responded', 'expired', 'cancelled'
      
      // SLA pause tracking
      table.boolean('pause_sla').defaultTo(true);
      table.timestamp('sla_paused_at').nullable();
      table.timestamp('sla_resumed_at').nullable();
      table.integer('sla_paused_hours').nullable(); // Total hours SLA was paused
      
      // Expiry configuration
      table.integer('expiry_hours').defaultTo(48); // Default 48 hours to respond
      table.timestamp('expires_at').nullable();
      
      // Task state before clarification (for restoration)
      table.string('previous_task_status', 50).nullable();
      table.jsonb('previous_task_state').nullable(); // Store any additional state
      
      // Priority/Urgency
      table.string('urgency', 20).defaultTo('normal'); // 'low', 'normal', 'high', 'critical'
      
      // Timestamps
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      
      // Indexes
      table.index('task_id');
      table.index('tenant_id');
      table.index('requester_id');
      table.index('responder_id');
      table.index('status');
      table.index('created_at');
    });

    // Create additional indexes
    await knex.raw(`CREATE INDEX IF NOT EXISTS idx_task_clarifications_task_status ON task_clarifications(task_id, status);`);
    await knex.raw(`CREATE INDEX IF NOT EXISTS idx_task_clarifications_pending ON task_clarifications(status) WHERE status = 'pending';`);
    await knex.raw(`CREATE INDEX IF NOT EXISTS idx_task_clarifications_responder_pending ON task_clarifications(responder_id, status) WHERE status = 'pending';`);

    console.log('✅ Created task_clarifications table');
  } else {
    console.log('⏭️ task_clarifications table already exists');
  }

  // Create clarification_audit table for full audit trail
  const auditTableExists = await knex.schema.hasTable('clarification_audit');
  
  if (!auditTableExists) {
    await knex.schema.createTable('clarification_audit', (table) => {
      table.increments('id').primary();
      
      table.uuid('clarification_id').notNullable().references('id').inTable('task_clarifications').onDelete('CASCADE');
      table.integer('task_id').notNullable();
      table.uuid('tenant_id').nullable();
      
      // Who performed the action (integer user ID - no FK constraint since users is a VIEW)
      table.integer('actor_id').notNullable();
      table.string('actor_name', 255).nullable();
      table.string('actor_role', 100).nullable();
      
      // What action was performed
      table.string('action', 50).notNullable();
      // Actions: 'request_clarification', 'respond', 'cancel', 'expire', 'remind', 'extend', 'reopen'
      
      // Old and new values for tracking changes
      table.string('old_status', 50).nullable();
      table.string('new_status', 50).nullable();
      
      // Additional details
      table.text('comment').nullable();
      table.jsonb('metadata').nullable();
      
      // Timestamp
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      
      // Indexes
      table.index('clarification_id');
      table.index('task_id');
      table.index('actor_id');
      table.index('created_at');
    });

    console.log('✅ Created clarification_audit table');
  }

  // Add clarification-related columns to workflow_tasks
  await knex.schema.alterTable('workflow_tasks', (table) => {
    // Track current clarification count
    table.integer('active_clarification_count').defaultTo(0);
    
    // Maximum allowed concurrent clarifications
    table.integer('max_concurrent_clarifications').defaultTo(3);
    
    // Flag for clarification state
    table.boolean('is_waiting_for_clarification').defaultTo(false);
    
    // Total SLA pause time due to clarifications (in hours)
    table.decimal('total_clarification_pause_hours', 10, 2).defaultTo(0);
  });

  console.log('✅ Added clarification fields to workflow_tasks');

  // Create function and trigger for updating updated_at
  if (isPostgres) {
    await knex.raw(`
      CREATE OR REPLACE FUNCTION update_task_clarifications_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await knex.raw(`
      DROP TRIGGER IF EXISTS update_task_clarifications_updated_at_trigger ON task_clarifications;
      CREATE TRIGGER update_task_clarifications_updated_at_trigger
        BEFORE UPDATE ON task_clarifications
        FOR EACH ROW EXECUTE FUNCTION update_task_clarifications_updated_at();
    `);

    console.log('✅ Created update trigger for task_clarifications');
  }
};

exports.down = async function(knex) {
  // Remove columns from workflow_tasks
  await knex.schema.alterTable('workflow_tasks', (table) => {
    table.dropColumn('active_clarification_count');
    table.dropColumn('max_concurrent_clarifications');
    table.dropColumn('is_waiting_for_clarification');
    table.dropColumn('total_clarification_pause_hours');
  });

  // Drop tables
  await knex.schema.dropTableIfExists('clarification_audit');
  await knex.schema.dropTableIfExists('task_clarifications');
  
  // Drop trigger and function
  const isPostgres = knex.client.config.client === 'pg' || knex.client.config.client === 'postgresql';
  if (isPostgres) {
    await knex.raw(`DROP FUNCTION IF EXISTS update_task_clarifications_updated_at() CASCADE;`);
    await knex.raw(`DROP TYPE IF EXISTS clarification_status CASCADE;`);
  }

  console.log('⬇️ Dropped task_clarifications and clarification_audit tables');
};
