/**
 * Review Service
 * 
 * Handles post-completion review operations:
 * - Send for review (forward completed task)
 * - Acknowledge review
 * - Add comments
 * - Cancel review
 * - Expire overdue reviews
 * 
 * Key principle: Task status NEVER changes - remains COMPLETED
 */

const { getKnex } = require('../database/knex');
const { v4: uuidv4 } = require('uuid');

// Review purposes
const ReviewPurpose = {
  FYI: 'FYI',
  CONFIRMATION: 'CONFIRMATION',
  AUDIT: 'AUDIT',
  KNOWLEDGE: 'KNOWLEDGE'
};

// Review statuses
const ReviewStatus = {
  PENDING: 'PENDING',
  ACKNOWLEDGED: 'ACKNOWLEDGED',
  COMMENTED: 'COMMENTED',
  EXPIRED: 'EXPIRED',
  CANCELLED: 'CANCELLED'
};

// Purpose descriptions for UI
const PurposeDescriptions = {
  FYI: 'For Information Only - No action required',
  CONFIRMATION: 'Request Confirmation - Please confirm understanding',
  AUDIT: 'Audit Review - For compliance/audit purposes',
  KNOWLEDGE: 'Knowledge Sharing - For training/reference'
};

/**
 * Send a completed task for review
 */
async function sendForReview({
  taskId,
  senderId,
  reviewerId = null,
  reviewerDepartmentId = null,
  purpose = ReviewPurpose.FYI,
  note = null,
  attachments = [],
  expiryDays = null,
  priority = 'normal',
  tenantId
}) {
  const knex = getKnex();
  
  return await knex.transaction(async (trx) => {
    // 1. Verify task exists and is COMPLETED
    const task = await trx('workflow_tasks')
      .where({ id: taskId, tenant_id: tenantId })
      .first();
    
    if (!task) {
      throw new Error('Task not found');
    }
    
    if (task.status !== 'COMPLETED') {
      throw new Error('Only COMPLETED tasks can be sent for review');
    }
    
    // 2. Verify sender has access to the task
    const canSend = await canUserSendForReview(trx, taskId, senderId, tenantId);
    if (!canSend) {
      throw new Error('You do not have permission to send this task for review');
    }
    
    // 3. Verify reviewer or department is specified
    if (!reviewerId && !reviewerDepartmentId) {
      throw new Error('Either reviewer or department must be specified');
    }
    
    // 4. If reviewer specified, verify they exist
    if (reviewerId) {
      const reviewer = await trx('users')
        .where({ id: reviewerId })
        .first();
      
      if (!reviewer) {
        throw new Error('Reviewer not found');
      }
    }
    
    // 5. Calculate expiry date if specified
    let expiresAt = null;
    if (expiryDays && expiryDays > 0) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiryDays);
    }
    
    // 6. Create the review record
    const reviewId = uuidv4();
    const [review] = await trx('task_reviews')
      .insert({
        id: reviewId,
        task_id: taskId,
        sender_id: senderId,
        reviewer_id: reviewerId,
        reviewer_department_id: reviewerDepartmentId,
        purpose,
        note,
        attachments: JSON.stringify(attachments),
        status: ReviewStatus.PENDING,
        expiry_days: expiryDays,
        expires_at: expiresAt,
        priority,
        tenant_id: tenantId,
        created_at: new Date(),
        updated_at: new Date()
      })
      .returning('*');
    
    // 7. Update task review counters
    await trx('workflow_tasks')
      .where({ id: taskId })
      .update({
        active_review_count: trx.raw('COALESCE(active_review_count, 0) + 1'),
        has_pending_review: true,
        total_review_count: trx.raw('COALESCE(total_review_count, 0) + 1'),
        updated_at: new Date()
      });
    
    // 8. Create audit entry
    await createReviewAudit(trx, {
      reviewId,
      actorId: senderId,
      action: 'send',
      oldStatus: null,
      newStatus: ReviewStatus.PENDING,
      comment: `Sent for ${purpose} review${reviewerId ? ' to specific user' : ' to department'}`,
      metadata: { purpose, reviewerId, reviewerDepartmentId },
      tenantId
    });
    
    // 9. Create task audit entry
    await trx('task_audit').insert({
      task_id: taskId,
      actor_id: senderId,
      action: 'review_requested',
      details: JSON.stringify({
        review_id: reviewId,
        purpose,
        reviewer_id: reviewerId,
        reviewer_department_id: reviewerDepartmentId
      }),
      tenant_id: tenantId,
      created_at: new Date()
    });
    
    return {
      ...review,
      attachments: JSON.parse(review.attachments || '[]')
    };
  });
}

/**
 * Acknowledge a review
 */
async function acknowledgeReview({
  reviewId,
  acknowledgerId,
  acknowledgmentNote = null,
  tenantId
}) {
  const knex = getKnex();
  
  return await knex.transaction(async (trx) => {
    // 1. Get the review
    const review = await trx('task_reviews')
      .where({ id: reviewId, tenant_id: tenantId })
      .first();
    
    if (!review) {
      throw new Error('Review not found');
    }
    
    if (review.status !== ReviewStatus.PENDING && review.status !== ReviewStatus.COMMENTED) {
      throw new Error(`Cannot acknowledge a ${review.status} review`);
    }
    
    // 2. Verify acknowledger is the reviewer or in the department
    const canAcknowledge = await canUserAcknowledgeReview(trx, review, acknowledgerId, tenantId);
    if (!canAcknowledge) {
      throw new Error('You do not have permission to acknowledge this review');
    }
    
    const oldStatus = review.status;
    
    // 3. Update the review
    const [updatedReview] = await trx('task_reviews')
      .where({ id: reviewId })
      .update({
        status: ReviewStatus.ACKNOWLEDGED,
        acknowledgment_note: acknowledgmentNote,
        acknowledged_at: new Date(),
        acknowledged_by: acknowledgerId,
        updated_at: new Date()
      })
      .returning('*');
    
    // 4. Update task counters
    await trx('workflow_tasks')
      .where({ id: review.task_id })
      .update({
        active_review_count: trx.raw('GREATEST(COALESCE(active_review_count, 1) - 1, 0)'),
        updated_at: new Date()
      });
    
    // Check if there are any remaining pending reviews
    const pendingCount = await trx('task_reviews')
      .where({ task_id: review.task_id, tenant_id: tenantId })
      .whereIn('status', [ReviewStatus.PENDING, ReviewStatus.COMMENTED])
      .count('id as count')
      .first();
    
    if (parseInt(pendingCount.count) === 0) {
      await trx('workflow_tasks')
        .where({ id: review.task_id })
        .update({ has_pending_review: false });
    }
    
    // 5. Create audit entry
    await createReviewAudit(trx, {
      reviewId,
      actorId: acknowledgerId,
      action: 'acknowledge',
      oldStatus,
      newStatus: ReviewStatus.ACKNOWLEDGED,
      comment: acknowledgmentNote,
      metadata: {},
      tenantId
    });
    
    // 6. Create task audit entry
    await trx('task_audit').insert({
      task_id: review.task_id,
      actor_id: acknowledgerId,
      action: 'review_acknowledged',
      details: JSON.stringify({
        review_id: reviewId,
        purpose: review.purpose,
        note: acknowledgmentNote
      }),
      tenant_id: tenantId,
      created_at: new Date()
    });
    
    return {
      ...updatedReview,
      attachments: JSON.parse(updatedReview.attachments || '[]')
    };
  });
}

/**
 * Add a comment to a review
 */
async function addReviewComment({
  reviewId,
  authorId,
  content,
  attachments = [],
  parentId = null,
  tenantId
}) {
  const knex = getKnex();
  
  return await knex.transaction(async (trx) => {
    // 1. Get the review
    const review = await trx('task_reviews')
      .where({ id: reviewId, tenant_id: tenantId })
      .first();
    
    if (!review) {
      throw new Error('Review not found');
    }
    
    if (review.status === ReviewStatus.CANCELLED || review.status === ReviewStatus.EXPIRED) {
      throw new Error(`Cannot comment on a ${review.status} review`);
    }
    
    // 2. Verify commenter has access
    const canComment = await canUserCommentOnReview(trx, review, authorId, tenantId);
    if (!canComment) {
      throw new Error('You do not have permission to comment on this review');
    }
    
    // 3. Create the comment
    const commentId = uuidv4();
    const [comment] = await trx('review_comments')
      .insert({
        id: commentId,
        review_id: reviewId,
        author_id: authorId,
        content,
        attachments: JSON.stringify(attachments),
        parent_id: parentId,
        tenant_id: tenantId,
        created_at: new Date(),
        updated_at: new Date()
      })
      .returning('*');
    
    // 4. Update review status if it was PENDING and reviewer is commenting
    const isReviewer = review.reviewer_id === authorId;
    if (review.status === ReviewStatus.PENDING && isReviewer) {
      await trx('task_reviews')
        .where({ id: reviewId })
        .update({
          status: ReviewStatus.COMMENTED,
          updated_at: new Date()
        });
    }
    
    // 5. Create audit entry
    await createReviewAudit(trx, {
      reviewId,
      actorId: authorId,
      action: 'comment',
      oldStatus: review.status,
      newStatus: isReviewer && review.status === ReviewStatus.PENDING ? ReviewStatus.COMMENTED : review.status,
      comment: content.substring(0, 200),
      metadata: { commentId, hasAttachments: attachments.length > 0 },
      tenantId
    });
    
    return {
      ...comment,
      attachments: JSON.parse(comment.attachments || '[]')
    };
  });
}

/**
 * Cancel a review request
 */
async function cancelReview({
  reviewId,
  cancelledById,
  reason = null,
  tenantId
}) {
  const knex = getKnex();
  
  return await knex.transaction(async (trx) => {
    // 1. Get the review
    const review = await trx('task_reviews')
      .where({ id: reviewId, tenant_id: tenantId })
      .first();
    
    if (!review) {
      throw new Error('Review not found');
    }
    
    if (review.status !== ReviewStatus.PENDING && review.status !== ReviewStatus.COMMENTED) {
      throw new Error(`Cannot cancel a ${review.status} review`);
    }
    
    // 2. Verify canceller is the sender
    if (review.sender_id !== cancelledById) {
      throw new Error('Only the sender can cancel a review request');
    }
    
    const oldStatus = review.status;
    
    // 3. Update the review
    const [updatedReview] = await trx('task_reviews')
      .where({ id: reviewId })
      .update({
        status: ReviewStatus.CANCELLED,
        updated_at: new Date()
      })
      .returning('*');
    
    // 4. Update task counters
    await trx('workflow_tasks')
      .where({ id: review.task_id })
      .update({
        active_review_count: trx.raw('GREATEST(COALESCE(active_review_count, 1) - 1, 0)'),
        updated_at: new Date()
      });
    
    // Check if there are any remaining pending reviews
    const pendingCount = await trx('task_reviews')
      .where({ task_id: review.task_id, tenant_id: tenantId })
      .whereIn('status', [ReviewStatus.PENDING, ReviewStatus.COMMENTED])
      .count('id as count')
      .first();
    
    if (parseInt(pendingCount.count) === 0) {
      await trx('workflow_tasks')
        .where({ id: review.task_id })
        .update({ has_pending_review: false });
    }
    
    // 5. Create audit entry
    await createReviewAudit(trx, {
      reviewId,
      actorId: cancelledById,
      action: 'cancel',
      oldStatus,
      newStatus: ReviewStatus.CANCELLED,
      comment: reason,
      metadata: {},
      tenantId
    });
    
    return {
      ...updatedReview,
      attachments: JSON.parse(updatedReview.attachments || '[]')
    };
  });
}

/**
 * Get all reviews for a task
 */
async function getReviewsForTask(taskId, tenantId, options = {}) {
  const knex = getKnex();
  const { status, limit = 50, offset = 0 } = options;
  
  let query = knex('task_reviews as r')
    .select(
      'r.*',
      'sender.name as sender_name',
      'sender.email as sender_email',
      'reviewer.name as reviewer_name',
      'reviewer.email as reviewer_email',
      'acknowledger.name as acknowledged_by_name'
    )
    .leftJoin('users as sender', 'r.sender_id', 'sender.id')
    .leftJoin('users as reviewer', 'r.reviewer_id', 'reviewer.id')
    .leftJoin('users as acknowledger', 'r.acknowledged_by', 'acknowledger.id')
    .where({ 'r.task_id': taskId, 'r.tenant_id': tenantId })
    .orderBy('r.created_at', 'desc');
  
  if (status) {
    query = query.where('r.status', status);
  }
  
  const reviews = await query.limit(limit).offset(offset);
  
  // Get comment counts for each review
  const reviewIds = reviews.map(r => r.id);
  if (reviewIds.length > 0) {
    const commentCounts = await knex('review_comments')
      .select('review_id')
      .count('id as count')
      .whereIn('review_id', reviewIds)
      .groupBy('review_id');
    
    const countMap = commentCounts.reduce((acc, c) => {
      acc[c.review_id] = parseInt(c.count);
      return acc;
    }, {});
    
    reviews.forEach(r => {
      r.comment_count = countMap[r.id] || 0;
      r.attachments = JSON.parse(r.attachments || '[]');
    });
  }
  
  return reviews;
}

/**
 * Get pending reviews for a user
 */
async function getPendingReviewsForUser(userId, tenantId, options = {}) {
  const knex = getKnex();
  const { page = 1, limit = 20 } = options;
  const offset = (page - 1) * limit;
  
  // Get user's department(s)
  const user = await knex('users')
    .where({ id: userId })
    .first();
  
  const userDepartments = user?.department_id ? [user.department_id] : [];
  
  // Build query for reviews where user is reviewer or in reviewer department
  const query = knex('task_reviews as r')
    .select(
      'r.*',
      't.title as task_title',
      't.status as task_status',
      't.priority as task_priority',
      'sender.name as sender_name',
      'sender.email as sender_email'
    )
    .join('workflow_tasks as t', 'r.task_id', 't.id')
    .leftJoin('users as sender', 'r.sender_id', 'sender.id')
    .where('r.tenant_id', tenantId)
    .whereIn('r.status', [ReviewStatus.PENDING, ReviewStatus.COMMENTED])
    .where(function() {
      this.where('r.reviewer_id', userId);
      if (userDepartments.length > 0) {
        this.orWhereIn('r.reviewer_department_id', userDepartments);
      }
    })
    .orderBy([
      { column: 'r.priority', order: 'desc' },
      { column: 'r.created_at', order: 'asc' }
    ]);
  
  const [reviews, countResult] = await Promise.all([
    query.clone().limit(limit).offset(offset),
    query.clone().count('r.id as total').first()
  ]);
  
  reviews.forEach(r => {
    r.attachments = JSON.parse(r.attachments || '[]');
  });
  
  return {
    reviews,
    pagination: {
      page,
      limit,
      total: parseInt(countResult.total),
      pages: Math.ceil(parseInt(countResult.total) / limit)
    }
  };
}

/**
 * Get reviews sent by a user
 */
async function getReviewsSentByUser(userId, tenantId, options = {}) {
  const knex = getKnex();
  const { page = 1, limit = 20, status } = options;
  const offset = (page - 1) * limit;
  
  let query = knex('task_reviews as r')
    .select(
      'r.*',
      't.title as task_title',
      't.status as task_status',
      'reviewer.name as reviewer_name',
      'reviewer.email as reviewer_email'
    )
    .join('workflow_tasks as t', 'r.task_id', 't.id')
    .leftJoin('users as reviewer', 'r.reviewer_id', 'reviewer.id')
    .where({ 'r.sender_id': userId, 'r.tenant_id': tenantId })
    .orderBy('r.created_at', 'desc');
  
  if (status) {
    query = query.where('r.status', status);
  }
  
  const [reviews, countResult] = await Promise.all([
    query.clone().limit(limit).offset(offset),
    query.clone().count('r.id as total').first()
  ]);
  
  reviews.forEach(r => {
    r.attachments = JSON.parse(r.attachments || '[]');
  });
  
  return {
    reviews,
    pagination: {
      page,
      limit,
      total: parseInt(countResult.total),
      pages: Math.ceil(parseInt(countResult.total) / limit)
    }
  };
}

/**
 * Get review details with comments
 */
async function getReviewDetails(reviewId, tenantId) {
  const knex = getKnex();
  
  const review = await knex('task_reviews as r')
    .select(
      'r.*',
      't.title as task_title',
      't.description as task_description',
      't.status as task_status',
      't.priority as task_priority',
      't.completed_at as task_completed_at',
      'sender.name as sender_name',
      'sender.email as sender_email',
      'reviewer.name as reviewer_name',
      'reviewer.email as reviewer_email',
      'acknowledger.name as acknowledged_by_name'
    )
    .join('workflow_tasks as t', 'r.task_id', 't.id')
    .leftJoin('users as sender', 'r.sender_id', 'sender.id')
    .leftJoin('users as reviewer', 'r.reviewer_id', 'reviewer.id')
    .leftJoin('users as acknowledger', 'r.acknowledged_by', 'acknowledger.id')
    .where({ 'r.id': reviewId, 'r.tenant_id': tenantId })
    .first();
  
  if (!review) {
    return null;
  }
  
  // Get comments
  const comments = await knex('review_comments as c')
    .select(
      'c.*',
      'author.name as author_name',
      'author.email as author_email'
    )
    .leftJoin('users as author', 'c.author_id', 'author.id')
    .where({ 'c.review_id': reviewId, 'c.tenant_id': tenantId })
    .orderBy('c.created_at', 'asc');
  
  comments.forEach(c => {
    c.attachments = JSON.parse(c.attachments || '[]');
  });
  
  return {
    ...review,
    attachments: JSON.parse(review.attachments || '[]'),
    comments
  };
}

/**
 * Get review audit trail
 */
async function getReviewAudit(reviewId, tenantId) {
  const knex = getKnex();
  
  const audit = await knex('review_audit as a')
    .select(
      'a.*',
      'actor.name as actor_name',
      'actor.email as actor_email'
    )
    .leftJoin('users as actor', 'a.actor_id', 'actor.id')
    .where({ 'a.review_id': reviewId, 'a.tenant_id': tenantId })
    .orderBy('a.created_at', 'asc');
  
  audit.forEach(a => {
    a.metadata = typeof a.metadata === 'string' ? JSON.parse(a.metadata) : a.metadata;
  });
  
  return audit;
}

/**
 * Get review statistics for a user
 */
async function getReviewStats(userId, tenantId) {
  const knex = getKnex();
  
  // Get user's department
  const user = await knex('users').where({ id: userId }).first();
  const userDepartments = user?.department_id ? [user.department_id] : [];
  
  // Pending reviews to respond to
  const pendingToMe = await knex('task_reviews')
    .where('tenant_id', tenantId)
    .whereIn('status', [ReviewStatus.PENDING, ReviewStatus.COMMENTED])
    .where(function() {
      this.where('reviewer_id', userId);
      if (userDepartments.length > 0) {
        this.orWhereIn('reviewer_department_id', userDepartments);
      }
    })
    .count('id as count')
    .first();
  
  // Reviews I sent that are pending
  const pendingSent = await knex('task_reviews')
    .where({ sender_id: userId, tenant_id: tenantId })
    .whereIn('status', [ReviewStatus.PENDING, ReviewStatus.COMMENTED])
    .count('id as count')
    .first();
  
  // Total reviews I've acknowledged
  const acknowledged = await knex('task_reviews')
    .where({ acknowledged_by: userId, tenant_id: tenantId })
    .count('id as count')
    .first();
  
  // Total reviews I've sent
  const totalSent = await knex('task_reviews')
    .where({ sender_id: userId, tenant_id: tenantId })
    .count('id as count')
    .first();
  
  return {
    pendingToReview: parseInt(pendingToMe.count),
    pendingSent: parseInt(pendingSent.count),
    totalAcknowledged: parseInt(acknowledged.count),
    totalSent: parseInt(totalSent.count)
  };
}

/**
 * Expire overdue reviews
 */
async function expireOverdueReviews() {
  const knex = getKnex();
  const now = new Date();
  
  return await knex.transaction(async (trx) => {
    // Find expired reviews
    const expiredReviews = await trx('task_reviews')
      .where('status', ReviewStatus.PENDING)
      .whereNotNull('expires_at')
      .where('expires_at', '<', now)
      .select('id', 'task_id', 'sender_id', 'tenant_id');
    
    if (expiredReviews.length === 0) {
      return { expired: 0 };
    }
    
    // Update reviews to expired
    await trx('task_reviews')
      .whereIn('id', expiredReviews.map(r => r.id))
      .update({
        status: ReviewStatus.EXPIRED,
        updated_at: now
      });
    
    // Create audit entries and update task counters
    for (const review of expiredReviews) {
      await createReviewAudit(trx, {
        reviewId: review.id,
        actorId: review.sender_id, // System action, attribute to sender
        action: 'expire',
        oldStatus: ReviewStatus.PENDING,
        newStatus: ReviewStatus.EXPIRED,
        comment: 'Review expired due to timeout',
        metadata: { automated: true },
        tenantId: review.tenant_id
      });
      
      // Update task counter
      await trx('workflow_tasks')
        .where({ id: review.task_id })
        .update({
          active_review_count: trx.raw('GREATEST(COALESCE(active_review_count, 1) - 1, 0)'),
          updated_at: now
        });
    }
    
    // Update has_pending_review flags
    const taskIds = [...new Set(expiredReviews.map(r => r.task_id))];
    for (const taskId of taskIds) {
      const pendingCount = await trx('task_reviews')
        .where({ task_id: taskId })
        .whereIn('status', [ReviewStatus.PENDING, ReviewStatus.COMMENTED])
        .count('id as count')
        .first();
      
      if (parseInt(pendingCount.count) === 0) {
        await trx('workflow_tasks')
          .where({ id: taskId })
          .update({ has_pending_review: false });
      }
    }
    
    return { expired: expiredReviews.length };
  });
}

/**
 * Record view action for audit
 */
async function recordReviewView(reviewId, viewerId, tenantId) {
  const knex = getKnex();
  
  await createReviewAudit(knex, {
    reviewId,
    actorId: viewerId,
    action: 'view',
    oldStatus: null,
    newStatus: null,
    comment: null,
    metadata: {},
    tenantId
  });
}

// Helper functions

async function canUserSendForReview(trx, taskId, userId, tenantId) {
  const task = await trx('workflow_tasks')
    .where({ id: taskId, tenant_id: tenantId })
    .first();
  
  if (!task) return false;
  
  // Creator, assignee, or approver can send for review
  return (
    task.created_by === userId ||
    task.assigned_to === userId ||
    task.approver_id === userId
  );
}

async function canUserAcknowledgeReview(trx, review, userId, tenantId) {
  // Direct reviewer
  if (review.reviewer_id === userId) {
    return true;
  }
  
  // Department-based reviewer
  if (review.reviewer_department_id) {
    const user = await trx('users')
      .where({ id: userId })
      .first();
    
    return user?.department_id === review.reviewer_department_id;
  }
  
  return false;
}

async function canUserCommentOnReview(trx, review, userId, tenantId) {
  // Sender can always comment
  if (review.sender_id === userId) {
    return true;
  }
  
  // Reviewer can comment
  if (review.reviewer_id === userId) {
    return true;
  }
  
  // Department members can comment
  if (review.reviewer_department_id) {
    const user = await trx('users')
      .where({ id: userId })
      .first();
    
    return user?.department_id === review.reviewer_department_id;
  }
  
  return false;
}

async function createReviewAudit(trx, {
  reviewId,
  actorId,
  action,
  oldStatus,
  newStatus,
  comment,
  metadata,
  tenantId
}) {
  await trx('review_audit').insert({
    review_id: reviewId,
    actor_id: actorId,
    action,
    old_status: oldStatus,
    new_status: newStatus,
    comment,
    metadata: JSON.stringify(metadata || {}),
    tenant_id: tenantId,
    created_at: new Date()
  });
}

module.exports = {
  // Constants
  ReviewPurpose,
  ReviewStatus,
  PurposeDescriptions,
  
  // Core operations
  sendForReview,
  acknowledgeReview,
  addReviewComment,
  cancelReview,
  
  // Queries
  getReviewsForTask,
  getPendingReviewsForUser,
  getReviewsSentByUser,
  getReviewDetails,
  getReviewAudit,
  getReviewStats,
  
  // Maintenance
  expireOverdueReviews,
  recordReviewView
};
