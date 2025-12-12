/**
 * Migration: Add Maker-Checker Dual-Mode Kanban fields
 * 
 * This migration adds support for:
 * - Task status state machine (ASSIGNED → IN_PROGRESS → IN_REVIEW → DONE/NEED_ATTENTION)
 * - Rejection tracking with reasons
 * - Task types (TASK, PAYMENT_REQUEST, etc.)
 * - Optimistic locking with version field
 * - Audit trail support
 */

exports.up = async function(knex) {
  // Check if we're using PostgreSQL
  const isPostgres = knex.client.config.client === 'pg' || knex.client.config.client === 'postgresql';

  if (isPostgres) {
    // Create enum type for task status if it doesn't exist
    await knex.raw(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'task_workflow_status') THEN
          CREATE TYPE task_workflow_status AS ENUM (
            'DRAFT',
            'ASSIGNED', 
            'IN_PROGRESS', 
            'IN_REVIEW', 
            'NEED_ATTENTION', 
            'DONE',
            'CANCELLED',
            'ARCHIVED'
          );
        END IF;
      END$$;
    `);
  }

  // Add new columns to workflow_tasks
  await knex.schema.alterTable('workflow_tasks', (table) => {
    // Rejection tracking
    if (!knex.schema.hasColumn('workflow_tasks', 'rejection_reason')) {
      table.text('rejection_reason').nullable();
    }
    
    // Task type for different workflows (TASK, PAYMENT_REQUEST, etc.)
    if (!knex.schema.hasColumn('workflow_tasks', 'task_type')) {
      table.string('task_type', 64).defaultTo('TASK').index();
    }
    
    // Optimistic locking version
    if (!knex.schema.hasColumn('workflow_tasks', 'version')) {
      table.bigInteger('version').notNullable().defaultTo(1);
    }
    
    // Track who last updated
    if (!knex.schema.hasColumn('workflow_tasks', 'updated_by')) {
      table.integer('updated_by').nullable().references('id').inTable('users');
    }
    
    // Track status change timestamp
    if (!knex.schema.hasColumn('workflow_tasks', 'last_status_change_at')) {
      table.timestamp('last_status_change_at').nullable();
    }
    
    // Previous status for audit trail
    if (!knex.schema.hasColumn('workflow_tasks', 'previous_status')) {
      table.string('previous_status', 50).nullable();
    }
    
    // Rejection count for tracking
    if (!knex.schema.hasColumn('workflow_tasks', 'rejection_count')) {
      table.integer('rejection_count').defaultTo(0);
    }
    
    // Submitted for review timestamp
    if (!knex.schema.hasColumn('workflow_tasks', 'submitted_for_review_at')) {
      table.timestamp('submitted_for_review_at').nullable();
    }
    
    // Review completed timestamp
    if (!knex.schema.hasColumn('workflow_tasks', 'review_completed_at')) {
      table.timestamp('review_completed_at').nullable();
    }
  });

  // Add index for status-based queries
  await knex.raw(`CREATE INDEX IF NOT EXISTS idx_workflow_tasks_status ON workflow_tasks(status);`);
  await knex.raw(`CREATE INDEX IF NOT EXISTS idx_workflow_tasks_type ON workflow_tasks(task_type);`);
  
  // Composite index for view mode queries
  await knex.raw(`CREATE INDEX IF NOT EXISTS idx_workflow_tasks_creator_status ON workflow_tasks(creator_id, status);`);
  await knex.raw(`CREATE INDEX IF NOT EXISTS idx_workflow_tasks_assignee_status ON workflow_tasks(assignee_id, status);`);

  console.log('✅ Added maker-checker fields to workflow_tasks');
};

exports.down = async function(knex) {
  const isPostgres = knex.client.config.client === 'pg' || knex.client.config.client === 'postgresql';

  // Remove columns
  await knex.schema.alterTable('workflow_tasks', (table) => {
    table.dropColumn('rejection_reason');
    table.dropColumn('task_type');
    table.dropColumn('version');
    table.dropColumn('updated_by');
    table.dropColumn('last_status_change_at');
    table.dropColumn('previous_status');
    table.dropColumn('rejection_count');
    table.dropColumn('submitted_for_review_at');
    table.dropColumn('review_completed_at');
  });

  // Drop indexes
  await knex.raw(`DROP INDEX IF EXISTS idx_workflow_tasks_status;`);
  await knex.raw(`DROP INDEX IF EXISTS idx_workflow_tasks_type;`);
  await knex.raw(`DROP INDEX IF EXISTS idx_workflow_tasks_creator_status;`);
  await knex.raw(`DROP INDEX IF EXISTS idx_workflow_tasks_assignee_status;`);

  // Drop enum type
  if (isPostgres) {
    await knex.raw(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'task_workflow_status') THEN
          DROP TYPE task_workflow_status;
        END IF;
      END$$;
    `);
  }

  console.log('⬇️ Removed maker-checker fields from workflow_tasks');
};
