/**
 * Copilate Smart Chat API Routes
 * Webhook endpoint for Mattermost integration
 */

import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import CopilateSmartAgent from '../services/copilateSmartAgent';

const router = Router();

/**
 * POST /api/copilate/message
 * Main webhook endpoint for processing messages
 */
router.post('/message', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { text, channelId, sessionId } = req.body;

    if (!text) {
      return res.status(400).json({
        success: false,
        error: 'Message text is required'
      });
    }

    // Process message through smart agent
    const reply = await CopilateSmartAgent.processMessage({
      userId,
      text,
      channelId,
      sessionId
    });

    res.json({
      success: true,
      reply: reply.text,
      type: reply.type,
      confidence: reply.confidence,
      requiresConfirmation: reply.requiresConfirmation,
      metadata: reply.metadata
    });

  } catch (error: any) {
    console.error('[Copilate] Message processing error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process message',
      details: error.message
    });
  }
});

/**
 * GET /api/copilate/permissions
 * Get current user's permissions
 */
router.get('/permissions', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    
    const permissions = await CopilateSmartAgent.getUserPermissions(userId);

    res.json({
      success: true,
      permissions
    });

  } catch (error: any) {
    console.error('[Copilate] Get permissions error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get permissions'
    });
  }
});

/**
 * POST /api/copilate/candidate
 * Create a candidate response for approval
 */
router.post('/candidate', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { termId, suggestedText, context } = req.body;

    if (!termId || !suggestedText) {
      return res.status(400).json({
        success: false,
        error: 'termId and suggestedText are required'
      });
    }

    const candidateId = await CopilateSmartAgent.createCandidateResponse(
      termId,
      suggestedText,
      userId,
      context
    );

    res.json({
      success: true,
      candidateId,
      message: 'Candidate response created. It will be reviewed for approval.'
    });

  } catch (error: any) {
    console.error('[Copilate] Create candidate error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create candidate response'
    });
  }
});

/**
 * POST /api/copilate/candidate/:id/vote
 * Vote on a candidate response
 */
router.post('/candidate/:id/vote', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { id } = req.params;
    const { voteType, comment } = req.body;

    if (!['up', 'down', 'neutral'].includes(voteType)) {
      return res.status(400).json({
        success: false,
        error: 'voteType must be "up", "down", or "neutral"'
      });
    }

    await CopilateSmartAgent.voteOnCandidate(id, userId, voteType, comment);

    res.json({
      success: true,
      message: 'Vote recorded successfully'
    });

  } catch (error: any) {
    console.error('[Copilate] Vote candidate error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to record vote'
    });
  }
});

/**
 * GET /api/copilate/admin/candidates
 * Get pending candidate responses (admin only)
 */
router.get('/admin/candidates', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    
    // Check permission
    const hasPermission = await CopilateSmartAgent.hasPermission(userId, 'approve_bot_replies');
    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        error: 'You do not have permission to view candidate responses'
      });
    }

    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();

    const candidates = await prisma.$queryRaw`
      SELECT * FROM pending_candidates
      ORDER BY votes DESC, created_at DESC
      LIMIT 50
    `;

    res.json({
      success: true,
      data: candidates,
      count: candidates.length
    });

  } catch (error: any) {
    console.error('[Copilate] Get candidates error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get candidate responses'
    });
  }
});

/**
 * POST /api/copilate/admin/candidates/:id/approve
 * Approve a candidate response (admin only)
 */
router.post('/admin/candidates/:id/approve', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { id } = req.params;
    const { addToKnowledgeBase = true } = req.body;
    
    // Check permission
    const hasPermission = await CopilateSmartAgent.hasPermission(userId, 'approve_bot_replies');
    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        error: 'You do not have permission to approve candidate responses'
      });
    }

    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();

    // Get candidate
    const candidate = await prisma.$queryRaw<Array<any>>`
      SELECT c.*, u.term
      FROM candidate_responses c
      JOIN unknown_terms u ON c.term_id = u.id
      WHERE c.id = ${id}::uuid
    `;

    if (!candidate[0]) {
      return res.status(404).json({
        success: false,
        error: 'Candidate not found'
      });
    }

    const { suggested_text, term } = candidate[0];

    // Mark as approved
    await prisma.$queryRaw`
      UPDATE candidate_responses
      SET approved = true, approved_by = ${userId}::uuid, approval_date = now()
      WHERE id = ${id}::uuid
    `;

    // Add to knowledge base if requested
    if (addToKnowledgeBase) {
      await prisma.$queryRaw`
        INSERT INTO knowledge_base (intent, keywords, reply_template, category, created_by)
        VALUES (
          ${`learned_${term}`},
          ARRAY[${term}]::text[],
          ${suggested_text},
          'learned',
          ${userId}::uuid
        )
      `;
    }

    // Log event
    await prisma.$queryRaw`
      INSERT INTO learning_events (event_type, candidate_id, user_id, details)
      VALUES (
        'manually_approved',
        ${id}::uuid,
        ${userId}::uuid,
        ${JSON.stringify({ term, addToKnowledgeBase })}::jsonb
      )
    `;

    res.json({
      success: true,
      message: 'Candidate approved successfully'
    });

  } catch (error: any) {
    console.error('[Copilate] Approve candidate error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to approve candidate'
    });
  }
});

/**
 * GET /api/copilate/admin/metrics
 * Get bot performance metrics (admin only)
 */
router.get('/admin/metrics', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    
    // Check permission
    const hasPermission = await CopilateSmartAgent.hasPermission(userId, 'view_audit_logs');
    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        error: 'You do not have permission to view metrics'
      });
    }

    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();

    const metrics = await prisma.$queryRaw`
      SELECT * FROM bot_metrics
      ORDER BY date DESC
      LIMIT 30
    `;

    res.json({
      success: true,
      data: metrics
    });

  } catch (error: any) {
    console.error('[Copilate] Get metrics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get metrics'
    });
  }
});

/**
 * GET /api/copilate/admin/unknown-terms
 * Get unknown terms for review (admin only)
 */
router.get('/admin/unknown-terms', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    
    // Check permission
    const hasPermission = await CopilateSmartAgent.hasPermission(userId, 'approve_bot_replies');
    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        error: 'You do not have permission to view unknown terms'
      });
    }

    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();

    const unknownTerms = await prisma.$queryRaw`
      SELECT * FROM unknown_terms
      WHERE status = 'pending'
      ORDER BY occurrences DESC, last_seen DESC
      LIMIT 100
    `;

    res.json({
      success: true,
      data: unknownTerms,
      count: unknownTerms.length
    });

  } catch (error: any) {
    console.error('[Copilate] Get unknown terms error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get unknown terms'
    });
  }
});

/**
 * POST /api/copilate/admin/knowledge
 * Add new knowledge base entry (admin only)
 */
router.post('/admin/knowledge', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    
    // Check permission
    const hasPermission = await CopilateSmartAgent.hasPermission(userId, 'manage_knowledge');
    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        error: 'You do not have permission to manage knowledge base'
      });
    }

    const {
      intent,
      keywords,
      replyTemplate,
      requiresRbac = false,
      requiredPermissions = [],
      requiresConfirmation = false,
      category = 'custom',
      priority = 0
    } = req.body;

    if (!intent || !keywords || !replyTemplate) {
      return res.status(400).json({
        success: false,
        error: 'intent, keywords, and replyTemplate are required'
      });
    }

    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();

    await prisma.$queryRaw`
      INSERT INTO knowledge_base (
        intent, keywords, reply_template, requires_rbac, required_permissions,
        requires_confirmation, category, priority, created_by
      )
      VALUES (
        ${intent},
        ${keywords}::text[],
        ${replyTemplate},
        ${requiresRbac},
        ${requiredPermissions}::text[],
        ${requiresConfirmation},
        ${category},
        ${priority},
        ${userId}::uuid
      )
    `;

    res.json({
      success: true,
      message: 'Knowledge base entry created successfully'
    });

  } catch (error: any) {
    console.error('[Copilate] Create knowledge error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create knowledge base entry'
    });
  }
});

export default router;
