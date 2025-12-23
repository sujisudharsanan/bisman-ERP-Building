/**
 * Migration: Create Task Reviews System
 * 
 * Purpose: Allows users to forward COMPLETED tasks to other users/departments
 * for review (similar to forwarding an old email).
 * 
 * Key features:
 * - Task status remains COMPLETED (no reopening)
 * - Reviewer has read-only access
 * - Reviewer can only comment or acknowledge
 * - Review is optional and non-blocking
 * - Fully audited
 * 
 * Review purposes:
 * - FYI: For information only
 * - CONFIRMATION: Request confirmation of understanding
 * - AUDIT: For audit/compliance review
 * - KNOWLEDGE: Knowledge sharing/training
 */

exports.up = async function(knex) {
  // Create enum for review purposes
  await knex.raw(`
    DO $$ BEGIN
      CREATE TYPE review_purpose AS ENUM ('FYI', 'CONFIRMATION', 'AUDIT', 'KNOWLEDGE');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `);

  // Create enum for review status
  await knex.raw(`
    DO $$ BEGIN
      CREATE TYPE review_status AS ENUM ('PENDING', 'ACKNOWLEDGED', 'COMMENTED', 'EXPIRED', 'CANCELLED');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `);

  // Create task_reviews table
  await knex.schema.createTable('task_reviews', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    
    // Task reference
    table.integer('task_id').notNullable();
    table.foreign('task_id').references('id').inTable('workflow_tasks').onDelete('CASCADE');
    
    // Sender (who is requesting the review) - integer user ID (no FK since users is a VIEW)
    table.integer('sender_id').notNullable();
    
    // Reviewer (target user - nullable if department-based)
    table.integer('reviewer_id').nullable();
    
    // Target department (alternative to specific user)
    table.string('reviewer_department_id', 50).nullable();
    
    // Review details
    table.specificType('purpose', 'review_purpose').notNullable().defaultTo('FYI');
    table.text('note').nullable(); // Sender's note about why they're sending for review
    table.jsonb('attachments').defaultTo('[]'); // Additional attachments for context
    
    // Status
    table.specificType('status', 'review_status').notNullable().defaultTo('PENDING');
    
    // Reviewer response
    table.text('acknowledgment_note').nullable(); // Reviewer's acknowledgment note
    table.timestamp('acknowledged_at').nullable();
    table.integer('acknowledged_by').nullable(); // integer user ID (no FK since users is a VIEW)
    
    // Expiry (optional - reviews can expire if not acknowledged)
    table.integer('expiry_days').nullable(); // Number of days before expiry
    table.timestamp('expires_at').nullable();
    
    // Priority for sorting/notification
    table.string('priority', 20).defaultTo('normal'); // low, normal, high
    
    // Tenant isolation
    table.string('tenant_id', 50).notNullable();
    
    // Timestamps
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  // Create review_comments table for threaded comments
  await knex.schema.createTable('review_comments', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    
    // Review reference
    table.uuid('review_id').notNullable();
    table.foreign('review_id').references('id').inTable('task_reviews').onDelete('CASCADE');
    
    // Comment author - integer user ID (no FK since users is a VIEW)
    table.integer('author_id').notNullable();
    
    // Comment content
    table.text('content').notNullable();
    table.jsonb('attachments').defaultTo('[]');
    
    // Parent comment for threading
    table.uuid('parent_id').nullable();
    table.foreign('parent_id').references('id').inTable('review_comments').onDelete('CASCADE');
    
    // Tenant isolation
    table.string('tenant_id', 50).notNullable();
    
    // Timestamps
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  // Create review_audit table for full audit trail
  await knex.schema.createTable('review_audit', (table) => {
    table.increments('id').primary();
    
    // Review reference
    table.uuid('review_id').notNullable();
    table.foreign('review_id').references('id').inTable('task_reviews').onDelete('CASCADE');
    
    // Actor - integer user ID (no FK since users is a VIEW)
    table.integer('actor_id').notNullable();
    
    // Action details
    table.string('action', 50).notNullable(); // send, view, comment, acknowledge, cancel, expire
    table.string('old_status', 50).nullable();
    table.string('new_status', 50).nullable();
    table.text('comment').nullable();
    table.jsonb('metadata').defaultTo('{}'); // Additional context
    
    // Tenant isolation
    table.string('tenant_id', 50).notNullable();
    
    // Timestamps
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });

  // Add review-related columns to workflow_tasks
  await knex.schema.alterTable('workflow_tasks', (table) => {
    // Count of active reviews
    table.integer('active_review_count').defaultTo(0);
    
    // Flag for quick filtering
    table.boolean('has_pending_review').defaultTo(false);
    
    // Total reviews ever sent for this task
    table.integer('total_review_count').defaultTo(0);
  });

  // Create indexes for performance
  await knex.schema.raw(`
    CREATE INDEX idx_task_reviews_task_id ON task_reviews(task_id);
    CREATE INDEX idx_task_reviews_sender_id ON task_reviews(sender_id);
    CREATE INDEX idx_task_reviews_reviewer_id ON task_reviews(reviewer_id);
    CREATE INDEX idx_task_reviews_reviewer_department ON task_reviews(reviewer_department_id);
    CREATE INDEX idx_task_reviews_status ON task_reviews(status);
    CREATE INDEX idx_task_reviews_tenant ON task_reviews(tenant_id);
    CREATE INDEX idx_task_reviews_purpose ON task_reviews(purpose);
    CREATE INDEX idx_task_reviews_expires_at ON task_reviews(expires_at) WHERE expires_at IS NOT NULL;
    CREATE INDEX idx_task_reviews_pending_by_reviewer ON task_reviews(reviewer_id, status) WHERE status = 'PENDING';
    
    CREATE INDEX idx_review_comments_review_id ON review_comments(review_id);
    CREATE INDEX idx_review_comments_author_id ON review_comments(author_id);
    CREATE INDEX idx_review_comments_parent_id ON review_comments(parent_id);
    CREATE INDEX idx_review_comments_tenant ON review_comments(tenant_id);
    
    CREATE INDEX idx_review_audit_review_id ON review_audit(review_id);
    CREATE INDEX idx_review_audit_actor_id ON review_audit(actor_id);
    CREATE INDEX idx_review_audit_action ON review_audit(action);
    CREATE INDEX idx_review_audit_tenant ON review_audit(tenant_id);
    CREATE INDEX idx_review_audit_created_at ON review_audit(created_at);
    
    CREATE INDEX idx_workflow_tasks_has_pending_review ON workflow_tasks(has_pending_review) WHERE has_pending_review = true;
  `);

  console.log('✅ Created task_reviews, review_comments, and review_audit tables');
  console.log('✅ Added review tracking columns to workflow_tasks');
  console.log('✅ Created all indexes for review system');
};

exports.down = async function(knex) {
  // Drop indexes first
  await knex.schema.raw(`
    DROP INDEX IF EXISTS idx_task_reviews_task_id;
    DROP INDEX IF EXISTS idx_task_reviews_sender_id;
    DROP INDEX IF EXISTS idx_task_reviews_reviewer_id;
    DROP INDEX IF EXISTS idx_task_reviews_reviewer_department;
    DROP INDEX IF EXISTS idx_task_reviews_status;
    DROP INDEX IF EXISTS idx_task_reviews_tenant;
    DROP INDEX IF EXISTS idx_task_reviews_purpose;
    DROP INDEX IF EXISTS idx_task_reviews_expires_at;
    DROP INDEX IF EXISTS idx_task_reviews_pending_by_reviewer;
    
    DROP INDEX IF EXISTS idx_review_comments_review_id;
    DROP INDEX IF EXISTS idx_review_comments_author_id;
    DROP INDEX IF EXISTS idx_review_comments_parent_id;
    DROP INDEX IF EXISTS idx_review_comments_tenant;
    
    DROP INDEX IF EXISTS idx_review_audit_review_id;
    DROP INDEX IF EXISTS idx_review_audit_actor_id;
    DROP INDEX IF EXISTS idx_review_audit_action;
    DROP INDEX IF EXISTS idx_review_audit_tenant;
    DROP INDEX IF EXISTS idx_review_audit_created_at;
    
    DROP INDEX IF EXISTS idx_workflow_tasks_has_pending_review;
  `);

  // Remove columns from workflow_tasks
  await knex.schema.alterTable('workflow_tasks', (table) => {
    table.dropColumn('active_review_count');
    table.dropColumn('has_pending_review');
    table.dropColumn('total_review_count');
  });

  // Drop tables in correct order (due to foreign keys)
  await knex.schema.dropTableIfExists('review_audit');
  await knex.schema.dropTableIfExists('review_comments');
  await knex.schema.dropTableIfExists('task_reviews');

  // Drop enums
  await knex.raw('DROP TYPE IF EXISTS review_status;');
  await knex.raw('DROP TYPE IF EXISTS review_purpose;');

  console.log('✅ Dropped task review system tables and columns');
};
