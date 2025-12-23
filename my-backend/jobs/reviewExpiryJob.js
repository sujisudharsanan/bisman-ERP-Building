/**
 * Review Expiry Job
 * 
 * Scheduled job to expire overdue reviews.
 * Should be run via cron every hour or as needed.
 * 
 * Usage:
 *   node jobs/reviewExpiryJob.js
 * 
 * Cron example (run every hour):
 *   0 * * * * cd /path/to/my-backend && node jobs/reviewExpiryJob.js
 */

const { initKnex, closeKnex } = require('../database/knex');

async function expireOverdueReviews() {
  const knex = require('../database/knex').getKnex();
  const now = new Date();
  
  try {
    // Find expired reviews
    const expiredReviews = await knex('task_reviews')
      .where('status', 'PENDING')
      .whereNotNull('expires_at')
      .where('expires_at', '<', now)
      .select('id', 'task_id', 'sender_id', 'tenant_id');
    
    if (expiredReviews.length === 0) {
      console.log('✓ No reviews to expire');
      return { expired: 0 };
    }
    
    console.log(`Found ${expiredReviews.length} review(s) to expire`);
    
    // Update reviews to expired
    await knex('task_reviews')
      .whereIn('id', expiredReviews.map(r => r.id))
      .update({
        status: 'EXPIRED',
        updated_at: now
      });
    
    // Create audit entries and update task counters
    for (const review of expiredReviews) {
      // Create audit entry
      await knex('review_audit').insert({
        review_id: review.id,
        actor_id: review.sender_id,
        action: 'expire',
        old_status: 'PENDING',
        new_status: 'EXPIRED',
        comment: 'Review expired due to timeout',
        metadata: JSON.stringify({ automated: true }),
        tenant_id: review.tenant_id,
        created_at: now
      });
      
      // Update task counter
      await knex('workflow_tasks')
        .where({ id: review.task_id })
        .update({
          active_review_count: knex.raw('GREATEST(COALESCE(active_review_count, 1) - 1, 0)'),
          updated_at: now
        });
    }
    
    // Update has_pending_review flags for affected tasks
    const taskIds = [...new Set(expiredReviews.map(r => r.task_id))];
    for (const taskId of taskIds) {
      const pendingCount = await knex('task_reviews')
        .where({ task_id: taskId })
        .whereIn('status', ['PENDING', 'COMMENTED'])
        .count('id as count')
        .first();
      
      if (parseInt(pendingCount.count) === 0) {
        await knex('workflow_tasks')
          .where({ id: taskId })
          .update({ has_pending_review: false });
      }
    }
    
    console.log(`✓ Expired ${expiredReviews.length} review(s)`);
    return { expired: expiredReviews.length };
    
  } catch (error) {
    console.error('Error expiring reviews:', error);
    throw error;
  }
}

// Main execution
async function main() {
  console.log('='.repeat(50));
  console.log('Review Expiry Job');
  console.log('Started at:', new Date().toISOString());
  console.log('='.repeat(50));
  
  try {
    // Initialize database connection
    await initKnex();
    
    // Run expiry
    const result = await expireOverdueReviews();
    
    console.log('\nResult:', result);
    console.log('Completed at:', new Date().toISOString());
    
  } catch (error) {
    console.error('Job failed:', error);
    process.exit(1);
  } finally {
    // Close database connection
    await closeKnex();
  }
}

// Run if called directly
if (require.main === module) {
  main().then(() => process.exit(0));
}

module.exports = { expireOverdueReviews };
