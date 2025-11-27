/**
 * BISMAN ERP - Intelligent Chat Service
 * The "brain" of the assistant - handles messages, memory, and context
 * WITHOUT requiring an LLM - uses intent detection and business logic
 */

const memoryRepo = require('./assistantMemory.repository');
const { detectIntent, getSuggestedClarifications } = require('../types/chat.intent');
const { pickTonePrefix, getTimeBasedGreeting, getDayPart, pickSmallTalk } = require('../types/chat.templates');

/**
 * @typedef {import('../types/chat.types').ChatReply} ChatReply
 * @typedef {import('../types/chat.types').ChatContext} ChatContext
 * @typedef {import('../types/chat.types').QuickAction} QuickAction
 */

class ChatService {
  /**
   * Main message handler - the core intelligence
   * @param {string} message - User's message
   * @param {ChatContext} ctx - User context (auth, branch, role)
   * @returns {Promise<ChatReply>}
   */
  async handleMessage(message, ctx) {
    const trimmed = message.trim();
    
    // Empty message check
    if (!trimmed) {
      return {
        text: "I didn't catch that. Could you type your request again?",
        tone: 'friendly',
      };
    }

    // Get user's memory
    const memory = await memoryRepo.getByUserId(ctx.userId);
    
    // Detect intent and entities
    const { intent, entities } = detectIntent(trimmed);

    // ==================== SMALL TALK ====================
    
    if (intent === 'GREETING') {
      const greeting = getTimeBasedGreeting();
      const isNewUser = !memory || memory.conversationCount === 0;
      
      const text = isNewUser
        ? `${greeting} ${ctx.userName}! 👋 I'm Bisman Assistant, here to help with your ERP tasks. What can I do for you?`
        : `${greeting} ${ctx.userName}! 😊 Good to see you again. How can I help you today?`;

      return {
        text,
        tone: 'friendly',
        quickActions: [
          { id: 'show_today_tasks', label: '📋 Show my tasks for today' },
          { id: 'show_cod_status', label: '💰 Show COD status' },
          { id: 'show_dashboard', label: '📊 Open dashboard' },
        ],
      };
    }

    if (intent === 'THANKS') {
      return {
        text: pickSmallTalk('thanks'),
        tone: 'friendly',
      };
    }

    if (intent === 'BYE') {
      return {
        text: pickSmallTalk('bye'),
        tone: 'friendly',
      };
    }

    if (intent === 'HELP') {
      return {
        text: this.getHelpMessage(ctx),
        tone: 'info',
        quickActions: [
          { id: 'example_cod', label: '💰 Example: COD query' },
          { id: 'example_tasks', label: '📋 Example: Task query' },
          { id: 'example_invoice', label: '📄 Example: Invoice query' },
        ],
      };
    }

    // ==================== BUSINESS INTENTS ====================

    // Determine effective branch (priority: message > current > memory > ask)
    const effectiveBranchName =
      entities.branchName ||
      ctx.currentBranchName ||
      memory?.preferences?.defaultBranchName ||
      undefined;

    // Dashboard request
    if (intent === 'DASHBOARD') {
      await this.updateMemory(ctx.userId, memory, null, 'DASHBOARD');
      
      return {
        text: `${pickTonePrefix('info')}\nOpening your dashboard overview${effectiveBranchName ? ` for ${effectiveBranchName}` : ''}.`,
        tone: 'info',
        quickActions: [
          { id: 'navigate_dashboard', label: '📊 Open dashboard', payload: { branchName: effectiveBranchName } },
        ],
        contextInfo: effectiveBranchName ? `Branch: ${effectiveBranchName}` : undefined,
      };
    }

    // COD Queries
    if (intent === 'COD_QUERY') {
      return await this.handleCodQuery(ctx, memory, entities, effectiveBranchName);
    }

    // Task Queries
    if (intent === 'TASK_QUERY') {
      return await this.handleTaskQuery(ctx, memory, entities);
    }

    // Task Creation
    if (intent === 'TASK_CREATE') {
      return await this.handleTaskCreate(ctx, memory);
    }

    // Invoice Queries
    if (intent === 'INVOICE_QUERY') {
      return await this.handleInvoiceQuery(ctx, memory, entities, effectiveBranchName);
    }

    // Payment Queries
    if (intent === 'PAYMENT_QUERY') {
      return await this.handlePaymentQuery(ctx, memory, entities, effectiveBranchName);
    }

    // Report Generation
    if (intent === 'REPORT') {
      return await this.handleReportRequest(ctx, memory, entities, effectiveBranchName);
    }

    // ==================== FALLBACK ====================
    
    return {
      text: this.getFallbackMessage(entities),
      tone: 'friendly',
      quickActions: [
        { id: 'show_help', label: '❓ Show help' },
        { id: 'show_capabilities', label: '🤖 What can you do?' },
      ],
    };
  }

  /**
   * Handle COD query with clarification flow
   */
  async handleCodQuery(ctx, memory, entities, effectiveBranchName) {
    // Missing branch - ask for clarification
    if (!effectiveBranchName) {
      return {
        text: "Got it, you want COD details. For which branch should I check? For example: Chennai, Mumbai, or Bangalore.",
        tone: 'friendly',
        quickActions: [
          { id: 'cod_chennai', label: '📍 Chennai', payload: { branch: 'Chennai' } },
          { id: 'cod_mumbai', label: '📍 Mumbai', payload: { branch: 'Mumbai' } },
          { id: 'cod_bangalore', label: '📍 Bangalore', payload: { branch: 'Bangalore' } },
        ],
      };
    }

    // Have branch but missing date range
    if (!entities.dateRange) {
      return {
        text: `Okay, COD status for ${effectiveBranchName}. For which period do you want to see it?`,
        tone: 'friendly',
        quickActions: [
          { id: 'cod_today', label: '📅 Today', payload: { period: 'TODAY', branchName: effectiveBranchName } },
          { id: 'cod_this_week', label: '📅 This week', payload: { period: 'THIS_WEEK', branchName: effectiveBranchName } },
          { id: 'cod_last_week', label: '📅 Last week', payload: { period: 'LAST_WEEK', branchName: effectiveBranchName } },
        ],
      };
    }

    // Full query - provide mock data (replace with real service calls)
    const prefix = pickTonePrefix('info');
    const periodText = entities.dateRange.replace(/_/g, ' ').toLowerCase();
    
    // TODO: Replace with actual COD service call
    // const codData = await this.codService.getCodStatus({ branchName: effectiveBranchName, period: entities.dateRange });
    
    const text =
      `${prefix}\n\n` +
      `**COD Status for ${effectiveBranchName}** (${periodText})\n\n` +
      `💰 **Pending:** ₹2,40,000\n` +
      `✅ **Cleared:** ₹7,80,000\n` +
      `⚠️ **Overdue:** ₹60,000\n\n` +
      `Total transactions: 124`;

    // Update memory
    await this.updateMemory(ctx.userId, memory, ctx.currentBranchId, 'COD', {
      defaultBranchName: effectiveBranchName,
      lastCodQuery: { branch: effectiveBranchName, period: entities.dateRange },
    });

    return {
      text,
      tone: 'info',
      quickActions: [
        {
          id: 'generate_cod_report',
          label: '📄 Generate report',
          payload: { branchName: effectiveBranchName, period: entities.dateRange },
        },
        {
          id: 'create_followup_task',
          label: '📋 Create follow-up task',
          payload: { module: 'COD', branchName: effectiveBranchName },
        },
        {
          id: 'view_cod_details', 
          label: '🔍 View details',
          payload: { branchName: effectiveBranchName },
        },
      ],
      contextInfo: `Branch: ${effectiveBranchName} · Module: COD`,
    };
  }

  /**
   * Handle task queries
   */
  async handleTaskQuery(ctx, memory, entities) {
    const prefix = pickTonePrefix('info');
    const statusFilter = entities.status ? ` (${entities.status})` : '';
    const dateFilter = entities.dateRange ? ` for ${entities.dateRange.replace(/_/g, ' ').toLowerCase()}` : '';
    
    // TODO: Replace with actual task service call
    // const tasks = await this.taskService.getTasks({ userId: ctx.userId, status: entities.status, dateRange: entities.dateRange });
    
    const text =
      `${prefix}\n\n` +
      `**Your Tasks${statusFilter}${dateFilter}**\n\n` +
      `1. 📋 Follow up COD clearance for Chennai (due today)\n` +
      `2. 📋 Update salary payable data (due tomorrow)\n` +
      `3. 📋 Review pending invoices (due in 3 days)\n\n` +
      `Showing 3 of 8 tasks`;

    await this.updateMemory(ctx.userId, memory, ctx.currentBranchId, 'TASKS');

    return {
      text,
      tone: entities.status === 'overdue' ? 'alert' : 'info',
      quickActions: [
        { id: 'view_all_tasks', label: '📋 View all tasks' },
        { id: 'create_new_task', label: '➕ Create new task' },
        { id: 'filter_tasks', label: '🔍 Filter tasks' },
      ],
      contextInfo: 'Module: Tasks',
    };
  }

  /**
   * Handle task creation
   */
  async handleTaskCreate(ctx, memory) {
    return {
      text: "Sure! I can help you create a new task. What should the task be about?",
      tone: 'friendly',
      quickActions: [
        { id: 'task_cod_followup', label: '💰 COD follow-up' },
        { id: 'task_invoice_review', label: '📄 Invoice review' },
        { id: 'task_payment_approval', label: '💳 Payment approval' },
        { id: 'task_custom', label: '✏️ Custom task' },
      ],
    };
  }

  /**
   * Handle invoice queries
   */
  async handleInvoiceQuery(ctx, memory, entities, effectiveBranchName) {
    if (!effectiveBranchName) {
      return {
        text: "Got it, invoice query. Which branch should I check?",
        tone: 'friendly',
      };
    }

    const prefix = pickTonePrefix('info');
    const periodText = entities.dateRange ? entities.dateRange.replace(/_/g, ' ').toLowerCase() : 'all time';
    
    const text =
      `${prefix}\n\n` +
      `**Invoices for ${effectiveBranchName}** (${periodText})\n\n` +
      `📄 **Total:** 45 invoices\n` +
      `✅ **Paid:** 38 (₹12,50,000)\n` +
      `⏳ **Pending:** 7 (₹2,80,000)`;

    await this.updateMemory(ctx.userId, memory, ctx.currentBranchId, 'INVOICES', {
      defaultBranchName: effectiveBranchName,
    });

    return {
      text,
      tone: 'info',
      quickActions: [
        { id: 'view_pending_invoices', label: '⏳ View pending' },
        { id: 'create_invoice', label: '➕ Create invoice' },
      ],
      contextInfo: `Branch: ${effectiveBranchName} · Module: Invoices`,
    };
  }

  /**
   * Handle payment queries
   */
  async handlePaymentQuery(ctx, memory, entities, effectiveBranchName) {
    const prefix = pickTonePrefix('info');
    
    const text =
      `${prefix}\n\n` +
      `**Payment Summary**\n\n` +
      `💳 **Pending Approvals:** 3 (₹1,25,000)\n` +
      `✅ **Approved This Month:** 24 (₹8,90,000)\n` +
      `⏳ **Processing:** 2 (₹45,000)`;

    await this.updateMemory(ctx.userId, memory, ctx.currentBranchId, 'PAYMENTS');

    return {
      text,
      tone: 'info',
      quickActions: [
        { id: 'view_pending_payments', label: '⏳ View pending' },
        { id: 'approve_payments', label: '✅ Approve payments' },
      ],
      contextInfo: 'Module: Payments',
    };
  }

  /**
   * Handle report generation
   */
  async handleReportRequest(ctx, memory, entities, effectiveBranchName) {
    return {
      text: "I can help you generate a report. What type of report do you need?",
      tone: 'friendly',
      quickActions: [
        { id: 'report_cod', label: '💰 COD Report', payload: { type: 'COD', branchName: effectiveBranchName } },
        { id: 'report_tasks', label: '📋 Task Report', payload: { type: 'TASKS' } },
        { id: 'report_invoices', label: '📄 Invoice Report', payload: { type: 'INVOICES', branchName: effectiveBranchName } },
        { id: 'report_payments', label: '💳 Payment Report', payload: { type: 'PAYMENTS' } },
      ],
    };
  }

  /**
   * Update memory helper
   */
  async updateMemory(userId, existingMemory, branchId, module, additionalPrefs = {}) {
    try {
      await memoryRepo.upsert({
        userId,
        lastBranchId: branchId || existingMemory?.lastBranchId,
        lastModule: module,
        preferences: {
          ...(existingMemory?.preferences || {}),
          ...additionalPrefs,
        },
        lastSummary: `Last query: ${module}`,
      });
    } catch (error) {
      console.error('Error updating memory:', error);
      // Don't fail the request if memory update fails
    }
  }

  /**
   * Get help message based on user role
   */
  getHelpMessage(ctx) {
    return (
      `Hi ${ctx.userName}! I'm Bisman Assistant 🤖\n\n` +
      `I can help you with:\n\n` +
      `💰 **COD Status** - "Show pending COD for Chennai last week"\n` +
      `📋 **Tasks** - "Show my overdue tasks"\n` +
      `📄 **Invoices** - "List today's invoices for Mumbai"\n` +
      `💳 **Payments** - "Show pending payment approvals"\n` +
      `📊 **Dashboard** - "Open dashboard"\n` +
      `📄 **Reports** - "Generate COD report"\n\n` +
      `Just ask naturally, and I'll figure out what you need!`
    );
  }

  /**
   * Get fallback message for unknown intents
   */
  getFallbackMessage(entities) {
    const hasEntities = entities.branchName || entities.dateRange || entities.status;
    
    if (hasEntities) {
      return (
        `I'm not quite sure what you're asking about${entities.branchName ? ` for ${entities.branchName}` : ''}. ` +
        `Try asking about COD, tasks, invoices, or payments. For example:\n\n` +
        `- "Show pending COD"\n` +
        `- "List my tasks for today"\n` +
        `- "Show invoices for this week"`
      );
    }

    return (
      `I'm not fully sure how to handle that yet. I can help with:\n\n` +
      `💰 COD status and collections\n` +
      `📋 Task management\n` +
      `📄 Invoices and billing\n` +
      `💳 Payment tracking\n\n` +
      `Try something like: "Show pending COD for Chennai" or "List my tasks"`
    );
  }
}

module.exports = new ChatService();
