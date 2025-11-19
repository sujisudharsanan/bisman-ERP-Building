/**
 * =====================================================
 * ULTIMATE UNIFIED CHAT ROUTES - All Features Combined
 * =====================================================
 * Combines the best of all chat systems!
 * =====================================================
 */

const express = require('express');
const { Pool } = require('pg');
const { getUnifiedChat } = require('../services/ai/unifiedChatEngine');
const rbacService = require('../services/rbacService');

const router = express.Router();

// Database connection
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'BISMAN',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Get the unified chat engine
const chat = getUnifiedChat();

// Session tracking for repeated questions
const sessionCache = new Map();

/**
 * Middleware to extract user from request
 * Supports multiple auth methods for compatibility
 * UPDATED: Now allows guest access for testing/development
 */
const extractUser = async (req, res, next) => {
  try {
    // Try different auth methods
    const userId = req.user?.id || 
                   req.user?.userId || 
                   req.headers['x-user-id'] || 
                   req.body.userId;
    
    if (!userId) {
      // For testing/development, allow guest access
      console.log('[UltimateChatAPI] No userId provided, allowing guest access');
      req.userId = 0;
      req.userRole = 'guest';
      return next();
    }
    
    // Try to get user role from database
    try {
      const userQuery = await pool.query(
        'SELECT id, role FROM users WHERE id = $1',
        [userId]
      );
      
      if (userQuery.rows.length > 0) {
        req.userId = parseInt(userId);
        req.userRole = userQuery.rows[0].role;
        console.log(`[UltimateChatAPI] User authenticated: ${req.userId} (${req.userRole})`);
      } else {
        // User not in DB, but allow as guest with provided ID
        console.log(`[UltimateChatAPI] User ${userId} not found in DB, allowing as guest`);
        req.userId = parseInt(userId);
        req.userRole = 'guest';
      }
    } catch (dbError) {
      console.warn('[UltimateChatAPI] DB lookup failed, allowing guest access:', dbError.message);
      req.userId = parseInt(userId);
      req.userRole = 'guest';
    }
    
    next();
  } catch (error) {
    console.error('[UltimateChatAPI] Auth error:', error);
    // Don't fail - allow guest access
    req.userId = 0;
    req.userRole = 'guest';
    next();
  }
};

router.use(extractUser);

/**
 * POST /api/chat/message
 * Send a message to the chat
 * 
 * COMBINES ALL FEATURES:
 * - Unified Chat engine (database-driven, NLP, spell check)
 * - Self-learning interaction logging
 * - Repeated question detection
 * - Human-like empathetic responses
 */
router.post('/message', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { message, conversationId, sessionId } = req.body;
    const userId = req.userId;
    const userRole = req.userRole;
    
    if (!message || message.trim().length === 0) {
      return res.status(400).json({ 
        success: false,
        error: 'Message is required' 
      });
    }
    
    const cleanedMessage = message.trim();
    const actualSessionId = sessionId || conversationId || `session_${userId}_${Date.now()}`;
    
    // Check for repeated questions
    const sessionKey = `${userId}_${actualSessionId}`;
    if (!sessionCache.has(sessionKey)) {
      sessionCache.set(sessionKey, []);
    }
    const history = sessionCache.get(sessionKey);
    
    // Count repeats (simple similarity check)
    const repeatCount = history.filter(h => 
      h.message.toLowerCase() === cleanedMessage.toLowerCase()
    ).length;
    
    // Handle repeated questions with escalating responses
    if (repeatCount >= 1) {
      let repeatResponse;
      if (repeatCount === 1) {
        repeatResponse = `I understand you're asking again about: "${cleanedMessage}". Let me try to explain differently. ${history[history.length - 1]?.response || 'Could you provide more details about what specifically you need help with?'}`;
      } else if (repeatCount === 2) {
        repeatResponse = `I notice you've asked this ${repeatCount + 1} times. I want to make sure I give you the right answer. Would it help if I connected you with a specialist who can assist you directly? Or could you rephrase your question with more details?`;
      } else {
        repeatResponse = `I apologize that I haven't been able to help you effectively with this question. I recommend creating a support ticket or speaking with a team member who can give you personalized assistance. Is there something else I can help you with?`;
      }
      
      // Log repeated interaction
      try {
        await pool.query(
          `INSERT INTO chat_interactions 
           (user_id, session_id, user_message, sanitized_message, bot_response, 
            intent, confidence, response_time_ms, is_flagged, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`,
          [userId, actualSessionId, cleanedMessage, cleanedMessage, repeatResponse,
           'repeated_question', 0.5, Date.now() - startTime, repeatCount >= 2]
        );
      } catch (logError) {
        console.warn('[UltimateChat] Log error:', logError.message);
      }
      
      return res.json({
        success: true,
        reply: repeatResponse,
        intent: 'repeated_question',
        confidence: 0.5,
        sessionId: actualSessionId,
        repeatCount: repeatCount + 1,
        suggestions: repeatCount >= 2
          ? ['Create support ticket', 'Talk to specialist', 'Try different question']
          : ['Give more details', 'Rephrase question', 'Share example']
      });
    }
    
    // Process through unified chat engine (has NLP, spell check, database responses)
    const result = await chat.processMessage(userId, cleanedMessage, actualSessionId);
    
    // Store in session history
    history.push({
      message: cleanedMessage,
      response: result.response || result.reply,
      timestamp: new Date()
    });
    
    // Keep only last 10 messages
    if (history.length > 10) {
      history.shift();
    }
    
    // Log the interaction for self-learning
    try {
      await pool.query(
        `INSERT INTO chat_interactions 
         (user_id, session_id, user_message, sanitized_message, bot_response, 
          intent, confidence, response_time_ms, is_flagged, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`,
        [userId, actualSessionId, cleanedMessage, cleanedMessage, 
         result.response || result.reply, result.intent || 'unknown',
         result.confidence || 0.8, Date.now() - startTime, 
         (result.confidence || 0.8) < 0.6] // auto-flag low confidence
      );
    } catch (logError) {
      console.warn('[UltimateChat] Logging failed:', logError.message);
    }
    
    // Return result
    res.json({
      success: true,
      ...result,
      sessionId: actualSessionId,
      metadata: {
        responseTime: Date.now() - startTime,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('[UltimateChatAPI] Error processing message:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      reply: "I'm sorry, I encountered an error. Please try again."
    });
  }
});

/**
 * POST /api/chat/greeting
 * Get personalized greeting with user's name and pending tasks since last login
 */
router.post('/greeting', async (req, res) => {
  try {
    const userId = req.userId;
    const userRole = req.userRole;
    
    let userName = 'there';
    let actualUserRole = userRole || 'guest';
    let lastLoginDate = null;
    let pendingTasksCount = 0;
    let pendingTasks = [];
    
    // Get user info and last login from database
    if (userId && userId > 0) {
      try {
        const userQuery = await pool.query(
          `SELECT first_name, last_name, last_login, previous_login 
           FROM users 
           WHERE id = $1`,
          [userId]
        );
        
        if (userQuery.rows.length > 0) {
          const user = userQuery.rows[0];
          userName = user.first_name || 'there';
          lastLoginDate = user.previous_login || user.last_login; // Use previous login for "since last time"
          
          // Update last_login to current time (move current to previous_login)
          await pool.query(
            `UPDATE users 
             SET previous_login = last_login, 
                 last_login = NOW() 
             WHERE id = $1`,
            [userId]
          );
          
          // Get pending tasks since last login
          const tasksQuery = await pool.query(
            `SELECT id, title, priority, due_date, status
             FROM tasks
             WHERE assignee_id = $1 
             AND status IN ('pending', 'in_progress', 'open')
             AND (created_at > $2 OR updated_at > $2)
             ORDER BY priority DESC, due_date ASC
             LIMIT 5`,
            [userId, lastLoginDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)] // Last 7 days if no last login
          );
          
          pendingTasks = tasksQuery.rows;
          pendingTasksCount = tasksQuery.rows.length;
        }
      } catch (dbError) {
        console.warn('[UltimateChatAPI] DB error fetching user data:', dbError.message);
      }
    }
    
    // Build personalized greeting
    const hour = new Date().getHours();
    let timeGreeting = 'Hello';
    if (hour < 12) timeGreeting = 'Good morning';
    else if (hour < 18) timeGreeting = 'Good afternoon';
    else timeGreeting = 'Good evening';
    
    // Construct greeting message with tasks
    let greetingMessage = `${timeGreeting}, ${userName}! ⚡`;
    
    if (pendingTasksCount > 0) {
      greetingMessage += `\n\nYou have ${pendingTasksCount} pending task${pendingTasksCount > 1 ? 's' : ''} since your last login:`;
      
      pendingTasks.forEach((task, index) => {
        const priorityEmoji = task.priority === 'high' ? '🔴' : task.priority === 'medium' ? '🟡' : '🟢';
        greetingMessage += `\n${index + 1}. ${priorityEmoji} ${task.title}`;
        if (task.due_date) {
          const dueDate = new Date(task.due_date);
          const isOverdue = dueDate < new Date();
          greetingMessage += isOverdue ? ' ⚠️ (Overdue)' : ` (Due: ${dueDate.toLocaleDateString()})`;
        }
      });
      
      greetingMessage += '\n\nHow can I assist you today?';
    } else {
      greetingMessage += ' You\'re all caught up! 🎉 How can I help you today?';
    }
    
    // Get role-based suggestions (simplified)
    const suggestions = [
      'Show my tasks',
      'Create a task',
      'Check my attendance',
      'Request leave',
      'View dashboard'
    ];
    
    res.json({
      success: true,
      greeting: greetingMessage, // Use the personalized greeting with tasks!
      suggestions,
      userRole: actualUserRole,
      pendingTasksCount,
      pendingTasks: pendingTasks.map(t => ({
        id: t.id,
        title: t.title,
        priority: t.priority,
        dueDate: t.due_date,
        status: t.status
      }))
    });
    
  } catch (error) {
    console.error('[UltimateChatAPI] Error generating greeting:', error);
    console.error('[UltimateChatAPI] Error stack:', error.stack);
    // Return error details for debugging
    res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack,
      greeting: 'Hello! How can I help you today?',
      suggestions: ['Show tasks', 'Get help', 'View dashboard']
    });
  }
});

/**
 * GET /api/chat/history
 * Get conversation history
 */
router.get('/history', async (req, res) => {
  try {
    const userId = req.userId;
    const limit = parseInt(req.query.limit) || 50;
    
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
 * POST /api/chat/feedback
 * Submit feedback on chat response
 */
router.post('/feedback', async (req, res) => {
  try {
    const userId = req.userId;
    const { interactionId, feedbackType, comment } = req.body;
    
    if (!interactionId || !feedbackType) {
      return res.status(400).json({
        success: false,
        error: 'interactionId and feedbackType are required'
      });
    }
    
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
    
    // Auto-flag negative feedback
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
router.get('/metrics', async (req, res) => {
  try {
    const userRole = req.userRole;
    
    if (!['super_admin', 'admin'].includes(userRole)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions'
      });
    }
    
    const metricsQuery = await pool.query(`
      SELECT 
        COUNT(*) as total_interactions,
        AVG(confidence) as avg_confidence,
        COUNT(DISTINCT user_id) as unique_users,
        COUNT(DISTINCT session_id) as total_sessions
      FROM chat_interactions
      WHERE created_at >= NOW() - INTERVAL '30 days'
    `);
    
    res.json({
      success: true,
      metrics: metricsQuery.rows[0]
    });
    
  } catch (error) {
    console.error('[UltimateChatAPI] Error fetching metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch metrics'
    });
  }
});

module.exports = router;
