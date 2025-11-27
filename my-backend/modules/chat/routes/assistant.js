/**
 * BISMAN ERP - Intelligent Assistant Chat Routes
 * POST /api/chat/assistant/message - Send message to intelligent assistant
 */

const express = require('express');
const router = express.Router();
const chatService = require('../services/chat.service');
const authenticateToken = require('../../../middleware/auth.middleware');

/**
 * POST /api/chat/assistant/message
 * Send a message to the intelligent assistant
 * 
 * Request body:
 * {
 *   "message": "Show pending COD for Chennai",
 *   "context": {  // optional additional context
 *     "branchId": 1,
 *     "branchName": "Chennai"
 *   }
 * }
 * 
 * Response:
 * {
 *   "text": "Here's the COD status for Chennai...",
 *   "tone": "info",
 *   "quickActions": [
 *     { "id": "generate_report", "label": "Generate Report", "payload": {...} }
 *   ],
 *   "contextInfo": "Branch: Chennai · Module: COD"
 * }
 */
router.post('/message', authenticateToken, async (req, res) => {
  try {
    const { message, context: additionalContext } = req.body;

    // Validate message
    if (!message || typeof message !== 'string') {
      return res.status(400).json({
        text: 'Please provide a valid message.',
        tone: 'error',
      });
    }

    // Build context from authenticated user
    const ctx = {
      userId: req.user.id,
      userName: req.user.username || req.user.email?.split('@')[0] || 'User',
      roleName: req.user.role,
      currentBranchId: additionalContext?.branchId || req.user.branchId || undefined,
      currentBranchName: additionalContext?.branchName || req.user.branchName || undefined,
    };

    // Get intelligent response
    const reply = await chatService.handleMessage(message, ctx);

    // Return structured response
    res.json(reply);

  } catch (error) {
    console.error('❌ Intelligent assistant error:', error);
    
    res.status(500).json({
      text: 'Sorry, something went wrong while processing your request. Please try again.',
      tone: 'error',
    });
  }
});

/**
 * GET /api/chat/assistant/memory
 * Get current user's assistant memory (for debugging or context display)
 */
router.get('/memory', authenticateToken, async (req, res) => {
  try {
    const memoryRepo = require('../services/assistantMemory.repository');
    const memory = await memoryRepo.getByUserId(req.user.id);

    if (!memory) {
      return res.json({
        exists: false,
        message: 'No memory found for this user yet.',
      });
    }

    res.json({
      exists: true,
      memory: {
        lastModule: memory.lastModule,
        lastBranchId: memory.lastBranchId,
        preferences: memory.preferences,
        conversationCount: memory.conversationCount,
      },
    });

  } catch (error) {
    console.error('❌ Error fetching memory:', error);
    res.status(500).json({
      error: 'Failed to fetch memory',
    });
  }
});

/**
 * DELETE /api/chat/assistant/memory
 * Reset current user's assistant memory
 */
router.delete('/memory', authenticateToken, async (req, res) => {
  try {
    const memoryRepo = require('../services/assistantMemory.repository');
    await memoryRepo.reset(req.user.id);

    res.json({
      success: true,
      message: 'Memory reset successfully',
    });

  } catch (error) {
    console.error('❌ Error resetting memory:', error);
    res.status(500).json({
      error: 'Failed to reset memory',
    });
  }
});

/**
 * GET /api/chat/assistant/capabilities
 * Get list of assistant capabilities (what it can do)
 */
router.get('/capabilities', authenticateToken, async (req, res) => {
  try {
    res.json({
      capabilities: [
        {
          category: 'COD Management',
          description: 'Check COD status, collections, and pending amounts by branch and date',
          examples: [
            'Show pending COD for Chennai',
            'COD status for Mumbai last week',
            'Overdue COD collections',
          ],
        },
        {
          category: 'Task Management',
          description: 'View, filter, and create tasks with status tracking',
          examples: [
            'Show my tasks for today',
            'List overdue tasks',
            'Create a new task',
          ],
        },
        {
          category: 'Invoices',
          description: 'Track invoices, pending payments, and billing',
          examples: [
            'Show today\'s invoices for Chennai',
            'List pending invoices',
            'Invoice status for this month',
          ],
        },
        {
          category: 'Payments',
          description: 'Monitor payment approvals and processing',
          examples: [
            'Show pending payment approvals',
            'Payment summary for this month',
          ],
        },
        {
          category: 'Reports',
          description: 'Generate various reports and exports',
          examples: [
            'Generate COD report',
            'Export task report',
          ],
        },
      ],
      features: [
        'Context-aware responses',
        'Remembers your preferences',
        'Branch and time period detection',
        'Natural language understanding',
        'Quick action suggestions',
      ],
    });

  } catch (error) {
    console.error('❌ Error fetching capabilities:', error);
    res.status(500).json({
      error: 'Failed to fetch capabilities',
    });
  }
});

module.exports = router;
