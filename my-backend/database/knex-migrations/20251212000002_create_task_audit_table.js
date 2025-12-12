/**
 * Migration: Create task_audit table for compliance tracking
 * 
 * Records all state transitions and actions on tasks for:
 * - Audit trail
 * - Compliance reporting
 * - SLA monitoring
 * - Dispute resolution
 */

exports.up = async function(knex) {
  const exists = await knex.schema.hasTable('task_audit');
  
  if (!exists) {
    await knex.schema.createTable('task_audit', (table) => {
      table.increments('id').primary();
      
      // Reference to the task
      table.integer('task_id').notNullable().references('id').inTable('workflow_tasks').onDelete('CASCADE');
      table.index('task_id');
      
      // Who performed the action
      table.integer('actor_id').notNullable().references('id').inTable('users');
      table.string('actor_name', 255).nullable(); // Denormalized for faster queries
      table.string('actor_role', 100).nullable();
      
      // What action was performed
      table.string('action', 50).notNullable();
      // Actions: 'accept_start', 'complete_send_review', 'resubmit', 'approve', 'reject', 
      //          'create', 'update', 'delete', 'assign', 'reassign', 'comment', 'attach'
      
      // Status transition
      table.string('from_status', 50).nullable();
      table.string('to_status', 50).nullable();
      
      // Rejection/change reason
      table.text('reason').nullable();
      
      // Additional metadata (JSON)
      table.jsonb('metadata').nullable();
      // e.g., { changes: { priority: { old: 'LOW', new: 'HIGH' } }, ip: '...', userAgent: '...' }
      
      // Timestamps
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      
      // Tenant isolation
      table.uuid('tenant_id').nullable();
      table.index('tenant_id');
    });

    // Composite indexes for common queries
    await knex.raw(`CREATE INDEX IF NOT EXISTS idx_task_audit_task_created ON task_audit(task_id, created_at DESC);`);
    await knex.raw(`CREATE INDEX IF NOT EXISTS idx_task_audit_actor ON task_audit(actor_id, created_at DESC);`);
    await knex.raw(`CREATE INDEX IF NOT EXISTS idx_task_audit_action ON task_audit(action, created_at DESC);`);

    console.log('✅ Created task_audit table');
  } else {
    console.log('⏭️ task_audit table already exists');
  }
};

exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('task_audit');
  console.log('⬇️ Dropped task_audit table');
};
