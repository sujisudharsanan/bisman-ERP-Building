/**
 * Review Routes
 * 
 * REST API endpoints for post-completion task reviews.
 * Allows forwarding completed tasks for FYI, confirmation, audit, or knowledge purposes.
 */

const express = require('express');
const router = express.Router();
const reviewService = require('../services/reviewService');
const { authenticate } = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

/**
 * POST /api/reviews
 * Send a completed task for review
 */
router.post('/', async (req, res) => {
  try {
    const {
      taskId,
      reviewerId,
      reviewerDepartmentId,
      purpose,
      note,
      attachments,
      expiryDays,
      priority
    } = req.body;
    
    if (!taskId) {
      return res.status(400).json({ error: 'Task ID is required' });
    }
    
    if (!reviewerId && !reviewerDepartmentId) {
      return res.status(400).json({ error: 'Either reviewer or department must be specified' });
    }
    
    const review = await reviewService.sendForReview({
      taskId: parseInt(taskId),
      senderId: req.user.id,
      reviewerId: reviewerId ? parseInt(reviewerId) : null,
      reviewerDepartmentId,
      purpose: purpose || 'FYI',
      note,
      attachments: attachments || [],
      expiryDays: expiryDays ? parseInt(expiryDays) : null,
      priority: priority || 'normal',
      tenantId: req.user.tenant_id
    });
    
    // Emit socket event for real-time notification
    if (req.io) {
      const { emitReviewRequested } = require('../socket/taskSocket');
      emitReviewRequested(req.io, review, req.user.tenant_id);
    }
    
    res.status(201).json({
      success: true,
      message: 'Task sent for review successfully',
      review
    });
  } catch (error) {
    console.error('Error sending for review:', error);
    res.status(error.message.includes('not found') ? 404 : 400).json({
      error: error.message
    });
  }
});

/**
 * POST /api/reviews/:id/acknowledge
 * Acknowledge a review
 */
router.post('/:id/acknowledge', async (req, res) => {
  try {
    const { id } = req.params;
    const { acknowledgmentNote } = req.body;
    
    const review = await reviewService.acknowledgeReview({
      reviewId: id,
      acknowledgerId: req.user.id,
      acknowledgmentNote,
      tenantId: req.user.tenant_id
    });
    
    // Emit socket event
    if (req.io) {
      const { emitReviewAcknowledged } = require('../socket/taskSocket');
      emitReviewAcknowledged(req.io, review, req.user.tenant_id);
    }
    
    res.json({
      success: true,
      message: 'Review acknowledged successfully',
      review
    });
  } catch (error) {
    console.error('Error acknowledging review:', error);
    res.status(error.message.includes('not found') ? 404 : 400).json({
      error: error.message
    });
  }
});

/**
 * POST /api/reviews/:id/comment
 * Add a comment to a review
 */
router.post('/:id/comment', async (req, res) => {
  try {
    const { id } = req.params;
    const { content, attachments, parentId } = req.body;
    
    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Comment content is required' });
    }
    
    const comment = await reviewService.addReviewComment({
      reviewId: id,
      authorId: req.user.id,
      content: content.trim(),
      attachments: attachments || [],
      parentId,
      tenantId: req.user.tenant_id
    });
    
    // Emit socket event
    if (req.io) {
      const { emitReviewCommented } = require('../socket/taskSocket');
      emitReviewCommented(req.io, id, comment, req.user.tenant_id);
    }
    
    res.status(201).json({
      success: true,
      message: 'Comment added successfully',
      comment
    });
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(error.message.includes('not found') ? 404 : 400).json({
      error: error.message
    });
  }
});

/**
 * POST /api/reviews/:id/cancel
 * Cancel a review request
 */
router.post('/:id/cancel', async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    
    const review = await reviewService.cancelReview({
      reviewId: id,
      cancelledById: req.user.id,
      reason,
      tenantId: req.user.tenant_id
    });
    
    // Emit socket event
    if (req.io) {
      const { emitReviewCancelled } = require('../socket/taskSocket');
      emitReviewCancelled(req.io, review, req.user.tenant_id);
    }
    
    res.json({
      success: true,
      message: 'Review cancelled successfully',
      review
    });
  } catch (error) {
    console.error('Error cancelling review:', error);
    res.status(error.message.includes('not found') ? 404 : 400).json({
      error: error.message
    });
  }
});

/**
 * GET /api/reviews/pending
 * Get pending reviews for the current user
 */
router.get('/pending', async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    
    const result = await reviewService.getPendingReviewsForUser(
      req.user.id,
      req.user.tenant_id,
      { page: parseInt(page), limit: parseInt(limit) }
    );
    
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Error getting pending reviews:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/reviews/sent
 * Get reviews sent by the current user
 */
router.get('/sent', async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    
    const result = await reviewService.getReviewsSentByUser(
      req.user.id,
      req.user.tenant_id,
      { page: parseInt(page), limit: parseInt(limit), status }
    );
    
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Error getting sent reviews:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/reviews/stats
 * Get review statistics for the current user
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = await reviewService.getReviewStats(
      req.user.id,
      req.user.tenant_id
    );
    
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Error getting review stats:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/reviews/task/:taskId
 * Get all reviews for a specific task
 */
router.get('/task/:taskId', async (req, res) => {
  try {
    const { taskId } = req.params;
    const { status, limit = 50, offset = 0 } = req.query;
    
    const reviews = await reviewService.getReviewsForTask(
      parseInt(taskId),
      req.user.tenant_id,
      { status, limit: parseInt(limit), offset: parseInt(offset) }
    );
    
    res.json({
      success: true,
      reviews
    });
  } catch (error) {
    console.error('Error getting task reviews:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/reviews/available-reviewers
 * Get available users and departments for review selection
 * NOTE: This route MUST be defined BEFORE /:id to prevent route matching issues
 */
router.get('/available-reviewers', async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const currentUserId = req.user.id;
    const { q = '', limit = 50 } = req.query;
    const searchTerm = q.toLowerCase().trim();
    
    // Get prisma client
    const { getPrisma } = require('../lib/prisma');
    const prisma = getPrisma();
    
    // Fetch active users in the same tenant (excluding current user)
    const whereClause = {
      is_active: true,
      tenant_id: tenantId,
      NOT: { id: currentUserId }
    };
    
    // Add search filter if query provided
    if (searchTerm) {
      whereClause.AND = [
        {
          OR: [
            { username: { contains: searchTerm, mode: 'insensitive' } },
            { email: { contains: searchTerm, mode: 'insensitive' } },
          ]
        }
      ];
    }
    
    const users = await prisma.users_enhanced.findMany({
      where: whereClause,
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        profile_data: true,
      },
      take: parseInt(limit) || 50,
      orderBy: { username: 'asc' }
    });
    
    // Map users to required format
    const availableUsers = users.map(user => {
      const profileData = user.profile_data || {};
      return {
        id: user.id,
        name: user.username || user.email?.split('@')[0] || '',
        email: user.email,
        department: profileData.department || user.role || ''
      };
    });
    
    // Fetch active departments for this tenant
    let availableDepartments = [];
    try {
      const departments = await prisma.$queryRaw`
        SELECT id::text, name, code
        FROM departments
        WHERE tenant_id = ${tenantId}::uuid AND is_active = true
        ORDER BY name ASC
      `;
      availableDepartments = departments.map(d => ({
        id: d.id,
        name: d.name,
        code: d.code
      }));
    } catch (deptError) {
      console.warn('[Reviews] Could not fetch departments:', deptError.message);
      // Continue without departments - they may not have the departments table
    }
    
    res.json({
      success: true,
      users: availableUsers,
      departments: availableDepartments
    });
  } catch (error) {
    console.error('[Reviews] Error fetching available reviewers:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch available reviewers',
      message: error.message
    });
  }
});

/**
 * GET /api/reviews/:id
 * Get review details with comments
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const review = await reviewService.getReviewDetails(id, req.user.tenant_id);
    
    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }
    
    // Record view for audit
    await reviewService.recordReviewView(id, req.user.id, req.user.tenant_id);
    
    res.json({
      success: true,
      review
    });
  } catch (error) {
    console.error('Error getting review details:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/reviews/:id/audit
 * Get audit trail for a review
 */
router.get('/:id/audit', async (req, res) => {
  try {
    const { id } = req.params;
    
    const audit = await reviewService.getReviewAudit(id, req.user.tenant_id);
    
    res.json({
      success: true,
      audit
    });
  } catch (error) {
    console.error('Error getting review audit:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/reviews/purposes
 * Get available review purposes with descriptions
 */
router.get('/meta/purposes', async (req, res) => {
  res.json({
    success: true,
    purposes: [
      { value: 'FYI', label: 'For Information Only', description: 'No action required, just informing' },
      { value: 'CONFIRMATION', label: 'Request Confirmation', description: 'Please confirm you have reviewed and understood' },
      { value: 'AUDIT', label: 'Audit Review', description: 'For compliance or audit documentation' },
      { value: 'KNOWLEDGE', label: 'Knowledge Sharing', description: 'For training or future reference' }
    ]
  });
});

module.exports = router;
