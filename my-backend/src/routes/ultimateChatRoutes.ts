/**
 * =====================================================
 * ULTIMATE UNIFIED CHAT ROUTES - All Features Combined
 * =====================================================
 * Combines the best of:
 * 1. Unified Chat: Database-driven, RBAC, production-ready
 * 2. Intelligent Chat: NLP, intent detection, entity extraction
 * 3. Enhanced Chat: Self-learning, human-like responses, metrics
 * =====================================================
 */

import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import { EnhancedChatService } from '../services/chat/enhancedChatService';
import { rbacService, UserRole } from '../services/chat/rbacService';

const router = Router();

// Database connection
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'BISMAN',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Initialize Enhanced Chat Service
const enhancedChat = new EnhancedChatService(pool);

/**
 * Middleware to extract user from request
 * Supports multiple auth methods for compatibility
 */
const extractUser = async (req: Request, res: Response, next: Function) => {
  try {
    // Try different auth methods
    const userId = (req as any).user?.id || 
                   (req as any).user?.userId || 
                   req.headers['x-user-id'] || 
                   req.body.userId;
    
    if (!userId) {
      return res.status(401).json({ 
        success: false,
        error: 'Authentication required',
        message: 'Please log in to use the chat'
      });
    }
    
    // Get user role from database
    const userQuery = await pool.query(
      'SELECT id, role FROM users WHERE id = $1',
      [userId]
    );
    
    if (userQuery.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    (req as any).userId = parseInt(userId as string);
    (req as any).userRole = userQuery.rows[0].role as UserRole;
    
    next();
  } catch (error) {
    console.error('[UltimateChatAPI] Auth error:', error);
    return res.status(500).json({
      success: false,
      error: 'Authentication failed'
    });
  }
};

router.use(extractUser);

/**
 * POST /api/chat/message
 * Send a message to the chat
 * 
 * Features:
 * - NLP intent detection
 * - Entity extraction
 * - Self-learning with interaction logging
 * - Repeated question handling (3-tier)
 * - Human-like empathetic responses
 * - RBAC permission checking
 * - Confidence-based routing
 */
router.post('/message', async (req: Request, res: Response) => {
  try {
    const { message, conversationId, sessionId } = req.body;
    const userId = (req as any).userId;
    const userRole = (req as any).userRole;
    
    if (!message || message.trim().length === 0) {
      return res.status(400).json({ 
        success: false,
        error: 'Message is required' 
      });
    }
    
    // Process message through enhanced chat service
    const result = await enhancedChat.handleMessage(
      userId, 
      message.trim(), 
      userRole,
      sessionId || conversationId
    );
    
    res.json({
      success: true,
      ...result,
      // Include metadata for debugging/analytics
      metadata: {
        intent: result.intent,
        confidence: result.confidence,
        sessionId: result.sessionId,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('[UltimateChatAPI] Error processing message:', error);
    res.status(500).json({
      success: false,
      error: (error as Error).message,
      reply: "I'm sorry, I encountered an error. Please try again or contact support if this persists."
    });
  }
});

/**
 * POST /api/chat/greeting
 * Get personalized greeting based on user context
 */
router.post('/greeting', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const userRole = (req as any).userRole;
    
    // Get user info from database
    const userQuery = await pool.query(
      `SELECT first_name, last_name, last_login 
       FROM users WHERE id = $1`,
      [userId]
    );
    
    if (userQuery.rows.length === 0) {
      return res.json({
        success: true,
        greeting: 'Hello! How can I help you today?',
        suggestions: [
          'Show my tasks',
          'Check pending approvals',
          'View dashboard'
        ]
      });
    }
    
    const user = userQuery.rows[0];
    const name = user.first_name || 'there';
    const hour = new Date().getHours();
    
    let timeGreeting = 'Hello';
    if (hour < 12) timeGreeting = 'Good morning';
    else if (hour < 18) timeGreeting = 'Good afternoon';
    else timeGreeting = 'Good evening';
    
    // Get role-specific suggestions
    const suggestions = rbacService.getAllowedIntents(userRole)
      .slice(0, 5)
      .map(intent => {
        const intentMap: { [key: string]: string } = {
          'show_pending_tasks': 'Show my tasks',
          'create_task': 'Create a task',
          'check_attendance': 'Check my attendance',
          'request_leave': 'Request leave',
          'view_dashboard': 'View dashboard',
          'check_inventory': 'Check inventory',
          'create_payment_request': 'Create payment request'
        };
        return intentMap[intent] || intent;
      });
    
    res.json({
      success: true,
      greeting: `${timeGreeting}, ${name}! How can I assist you today?`,
      suggestions,
      userRole
    });
    
  } catch (error) {
    console.error('[UltimateChatAPI] Error generating greeting:', error);
    res.status(500).json({
      success: false,
      error: (error as Error).message,
      greeting: 'Hello! How can I help you today?'
    });
  }
});

/**
 * GET /api/chat/history
 * Get conversation history
 */
router.get('/history', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const limit = parseInt(req.query.limit as string) || 50;
    
    const historyQuery = await pool.query(
      `SELECT 
        user_message,
        bot_response,
        intent,
        confidence,
        created_at,
        session_id
       FROM chat_interactions
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [userId, limit]
    );
    
    res.json({
      success: true,
      history: historyQuery.rows,
      count: historyQuery.rows.length
    });
    
  } catch (error) {
    console.error('[UltimateChatAPI] Error fetching history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch history'
    });
  }
});

/**
 * DELETE /api/chat/history
 * Clear conversation history
 */
router.delete('/history', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    
    // Don't actually delete, just mark as cleared
    await pool.query(
      `UPDATE chat_sessions 
       SET is_cleared = true, cleared_at = NOW()
       WHERE user_id = $1 AND is_cleared = false`,
      [userId]
    );
    
    res.json({
      success: true,
      message: 'History cleared successfully'
    });
    
  } catch (error) {
    console.error('[UltimateChatAPI] Error clearing history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear history'
    });
  }
});

/**
 * POST /api/chat/feedback
 * Submit feedback on chat response (thumbs up/down)
 */
router.post('/feedback', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { interactionId, feedbackType, comment } = req.body;
    
    if (!interactionId || !feedbackType) {
      return res.status(400).json({
        success: false,
        error: 'interactionId and feedbackType are required'
      });
    }
    
    if (!['thumbs_up', 'thumbs_down'].includes(feedbackType)) {
      return res.status(400).json({
        success: false,
        error: 'feedbackType must be thumbs_up or thumbs_down'
      });
    }
    
    // Record feedback in database
    await pool.query(
      `INSERT INTO chat_feedback 
       (interaction_id, user_id, feedback_type, comment, created_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (interaction_id, user_id) 
       DO UPDATE SET 
         feedback_type = EXCLUDED.feedback_type,
         comment = EXCLUDED.comment,
         created_at = NOW()`,
      [interactionId, userId, feedbackType, comment]
    );
    
    // If thumbs down, auto-flag for review
    if (feedbackType === 'thumbs_down') {
      await pool.query(
        `INSERT INTO annotation_queue
         (interaction_id, flagged_reason, priority, status, created_at)
         VALUES ($1, $2, $3, $4, NOW())
         ON CONFLICT (interaction_id) DO NOTHING`,
        [interactionId, 'negative_feedback', 'medium', 'pending']
      );
    }
    
    res.json({
      success: true,
      message: 'Feedback recorded successfully'
    });
    
  } catch (error) {
    console.error('[UltimateChatAPI] Error recording feedback:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to record feedback'
    });
  }
});

/**
 * GET /api/chat/metrics
 * Get chat metrics (admin only)
 */
router.get('/metrics', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const userRole = (req as any).userRole;
    
    // Check if user is admin
    if (!['super_admin', 'admin'].includes(userRole)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions'
      });
    }
    
    // Get metrics from database
    const metricsQuery = await pool.query(`
      SELECT 
        COUNT(*) as total_interactions,
        AVG(confidence) as avg_confidence,
        COUNT(DISTINCT user_id) as unique_users,
        COUNT(DISTINCT session_id) as total_sessions,
        COUNT(*) FILTER (WHERE confidence < 0.6) as low_confidence_count,
        COUNT(*) FILTER (WHERE is_flagged = true) as flagged_count
      FROM chat_interactions
      WHERE created_at >= NOW() - INTERVAL '30 days'
    `);
    
    const feedbackQuery = await pool.query(`
      SELECT 
        feedback_type,
        COUNT(*) as count
      FROM chat_feedback
      WHERE created_at >= NOW() - INTERVAL '30 days'
      GROUP BY feedback_type
    `);
    
    res.json({
      success: true,
      metrics: {
        ...metricsQuery.rows[0],
        feedback: feedbackQuery.rows
      }
    });
    
  } catch (error) {
    console.error('[UltimateChatAPI] Error fetching metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch metrics'
    });
  }
});

/**
 * GET /api/chat/session/:sessionId
 * Get specific session details
 */
router.get('/session/:sessionId', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { sessionId } = req.params;
    
    const sessionQuery = await pool.query(
      `SELECT 
        ci.user_message,
        ci.bot_response,
        ci.intent,
        ci.confidence,
        ci.created_at,
        cf.feedback_type,
        cf.comment
       FROM chat_interactions ci
       LEFT JOIN chat_feedback cf ON ci.id = cf.interaction_id
       WHERE ci.session_id = $1 AND ci.user_id = $2
       ORDER BY ci.created_at ASC`,
      [sessionId, userId]
    );
    
    if (sessionQuery.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }
    
    res.json({
      success: true,
      session: {
        sessionId,
        messages: sessionQuery.rows
      }
    });
    
  } catch (error) {
    console.error('[UltimateChatAPI] Error fetching session:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch session'
    });
  }
});

export default router;
