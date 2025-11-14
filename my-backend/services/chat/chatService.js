/**
 * Simplified Chat Service (JavaScript)
 * Main orchestrator for intelligent chat processing
 * 
 * This is a simplified version that works standalone without external dependencies.
 * For production use, consider implementing the full TypeScript version with all features.
 */

const { Pool } = require('pg');
const {
  formatHumanReply,
  formatPermissionDenied,
  formatError,
  formatTaskList,
  sessionMemory,
  humanizeText
} = require('./humanizeService');

// Database connection (use existing connection or create new)
let pool;
try {
  const databaseUrl = process.env.DATABASE_URL;
  if (databaseUrl) {
    pool = new Pool({ connectionString: databaseUrl });
  }
} catch (e) {
  console.warn('[ChatService] Database not available, task management disabled');
}

class ChatService {
  constructor() {
    this.contexts = new Map();
    this.stats = {
      totalMessages: 0,
      successfulIntents: 0,
      failedIntents: 0
    };
  }

  /**
   * Main message handler
   */
  async handleMessage(message, userId, organizationId = 'default', context = {}, username = 'User', userRole = 'viewer') {
    try {
      this.stats.totalMessages++;

      // Get session memory for multi-turn conversations
      const previousContext = sessionMemory.get(userId);
      const pendingEntities = sessionMemory.getPendingEntities(userId);

      // Simple intent detection using keywords
      const intent = this.detectIntent(message);
      const entities = { ...pendingEntities, ...this.extractEntities(message) };
      const confidence = this.calculateConfidence(message, intent);

      // Check permissions
      const hasPermission = this.checkPermission(intent, userRole);
      if (!hasPermission) {
        const reply = formatPermissionDenied(
          username,
          intent.action,
          intent.requiredRole,
          userRole
        );

        return {
          response: reply,
          intent: intent.name,
          confidence,
          entities,
          permissionDenied: true,
          suggestedActions: ['Show what I can do', 'View my tasks', 'Get help']
        };
      }

      // Execute intent
      let baseResponse;
      let data = null;
      let taskCount = 0;

      switch (intent.name) {
        case 'create_task':
          baseResponse = await this.createTask(userId, organizationId, entities, username);
          this.stats.successfulIntents++;
          break;

        case 'show_tasks':
          data = await this.getPendingTasks(userId);
          taskCount = data ? data.length : 0;
          baseResponse = formatTaskList(data, username);
          this.stats.successfulIntents++;
          break;

        case 'greeting':
          // Use humanized greeting
          const humanGreeting = formatHumanReply({
            userName: username,
            userRole,
            intent: 'greeting',
            confidence: 1.0,
            entities
          });
          baseResponse = humanGreeting.reply;
          this.stats.successfulIntents++;
          break;

        case 'help':
          baseResponse = this.getHelpMessage(userRole, username);
          this.stats.successfulIntents++;
          break;

        case 'unknown':
          // Use humanized unknown handler
          const humanUnknown = formatHumanReply({
            userName: username,
            intent: 'unknown',
            confidence: 0.2,
            entities
          });
          baseResponse = humanUnknown.reply;
          this.stats.failedIntents++;
          break;

        default:
          // Use humanized response for unimplemented features
          const humanFallback = formatHumanReply({
            userName: username,
            intent: intent.name,
            confidence,
            entities,
            baseText: `I'd love to help you ${intent.action}! That feature is coming soon. ` +
                     `For now, I can help with tasks, leave requests, and inventory checks.`
          });
          baseResponse = humanFallback.reply;
          this.stats.failedIntents++;
      }

      // Store in session memory for multi-turn conversations
      sessionMemory.store(userId, {
        intent: intent.name,
        entities,
        response: baseResponse
      });

      // Format final response using humanization
      const humanResponse = formatHumanReply({
        userName: username,
        userRole,
        intent: intent.name,
        confidence,
        entities,
        baseText: baseResponse,
        taskCount
      });

      return {
        response: humanResponse.reply,
        intent: intent.name,
        confidence,
        entities,
        suggestedActions: this.getSuggestedActions(intent.name, userRole),
        data,
        context: { userId, organizationId, timestamp: new Date().toISOString() },
        persona: humanResponse.persona
      };

    } catch (error) {
      console.error('[ChatService] Error:', error);
      this.stats.failedIntents++;
      
      const errorReply = formatError(username, error.message);
      
      return {
        response: errorReply,
        intent: 'error',
        confidence: 0,
        entities: {},
        suggestedActions: ['🔄 Try again', '❓ Show help', '📋 View my tasks'],
        error: process.env.NODE_ENV !== 'production' ? error.message : undefined
      };
    }
  }

  /**
   * Simple intent detection using keywords and patterns
   */
  detectIntent(message) {
    const text = message.toLowerCase();

    const intents = [
      {
        name: 'create_task',
        action: 'create a task',
        patterns: ['create task', 'add task', 'new task', 'make task', 'task for', 'remind me', 'reminder', 'todo', 'to do', 'schedule', 'create a meeting', 'schedule meeting', 'book meeting', 'set up meeting', 'plan meeting', 'arrange meeting', 'meeting for', 'create meeting'],
        requiredRole: 'employee',
        priority: 10
      },
      {
        name: 'show_tasks',
        action: 'view tasks',
        patterns: ['show task', 'view task', 'my task', 'pending task', 'list task', 'what tasks', 'task list', 'tasks', 'what do i have', 'what should i do'],
        requiredRole: 'viewer',
        priority: 9
      },
      {
        name: 'check_inventory',
        action: 'check inventory',
        patterns: ['inventory', 'stock', 'product', 'item', 'warehouse', 'supplies'],
        requiredRole: 'inventory-manager',
        priority: 8
      },
      {
        name: 'request_leave',
        action: 'request leave',
        patterns: ['leave', 'vacation', 'time off', 'absent', 'holiday', 'pto', 'day off'],
        requiredRole: 'employee',
        priority: 7
      },
      {
        name: 'view_dashboard',
        action: 'view dashboard',
        patterns: ['dashboard', 'overview', 'summary', 'stats', 'analytics', 'insights', 'report'],
        requiredRole: 'viewer',
        priority: 6
      },
      {
        name: 'greeting',
        action: 'greet you',
        patterns: ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening', 'greetings', 'howdy', 'what\'s up', 'whats up', 'sup'],
        requiredRole: 'viewer',
        priority: 5
      },
      {
        name: 'help',
        action: 'show help',
        patterns: ['help', 'what can you do', 'commands', 'options', 'features', 'capabilities', 'how to', 'guide', 'assist'],
        requiredRole: 'viewer',
        priority: 5
      },
      {
        name: 'unknown',
        action: 'understand your request',
        patterns: [],
        requiredRole: 'viewer',
        priority: 0
      }
    ];

    // Find matching intent
    for (const intent of intents) {
      for (const pattern of intent.patterns) {
        if (text.includes(pattern)) {
          return intent;
        }
      }
    }

    // Default to unknown
    return intents[intents.length - 1];
  }

  /**
   * Extract entities from message (dates, priorities, etc.)
   */
  extractEntities(message) {
    const entities = {};

    // Extract date keywords
    const datePatterns = {
      'today': new Date(),
      'tomorrow': new Date(Date.now() + 86400000),
      'next week': new Date(Date.now() + 7 * 86400000),
      'monday': this.getNextWeekday(1),
      'tuesday': this.getNextWeekday(2),
      'wednesday': this.getNextWeekday(3),
      'thursday': this.getNextWeekday(4),
      'friday': this.getNextWeekday(5)
    };

    const lowerMessage = message.toLowerCase();
    for (const [keyword, date] of Object.entries(datePatterns)) {
      if (lowerMessage.includes(keyword)) {
        entities.date = date.toISOString().split('T')[0];
        entities.dateKeyword = keyword;
        break;
      }
    }

    // Extract priority
    if (lowerMessage.includes('urgent') || lowerMessage.includes('asap') || lowerMessage.includes('critical')) {
      entities.priority = 'high';
    } else if (lowerMessage.includes('low priority') || lowerMessage.includes('when you can')) {
      entities.priority = 'low';
    } else {
      entities.priority = 'medium';
    }

    // Extract task description (everything after "create task" or similar)
    const taskPatterns = /(?:create|add|make|new)\s+task\s+(?:for|to)?\s*(.+)/i;
    const match = message.match(taskPatterns);
    if (match && match[1]) {
      entities.description = match[1].trim();
    }

    return entities;
  }

  /**
   * Calculate confidence score
   */
  calculateConfidence(message, intent) {
    if (intent.name === 'unknown') return 0.2;
    
    const lowerMessage = message.toLowerCase();
    let score = 0.5; // Base score

    // Increase confidence based on pattern matches
    const matchCount = intent.patterns.filter(p => lowerMessage.includes(p)).length;
    score += matchCount * 0.2;

    // Cap at 0.95
    return Math.min(score, 0.95);
  }

  /**
   * Check if user has permission for intent
   */
  checkPermission(intent, userRole) {
    const roleHierarchy = {
      'viewer': 1,
      'employee': 2,
      'hr': 3,
      'accountant': 3,
      'inventory-manager': 3,
      'manager': 4,
      'admin': 5,
      'super-admin': 6,
      'ENTERPRISE_ADMIN': 6
    };

    const requiredLevel = roleHierarchy[intent.requiredRole] || 1;
    const userLevel = roleHierarchy[userRole] || 1;

    return userLevel >= requiredLevel;
  }

  /**
   * Create a task
   */
  async createTask(userId, organizationId, entities, username) {
    try {
      if (!pool) {
        const responses = [
          `I'd love to create that task for you: "${entities.description || 'New task'}" for ${entities.dateKeyword || 'later'}. Just need to connect to the database first.`,
          `Great idea! Once the database is connected, I'll create "${entities.description || 'your task'}" right away.`,
          `Got it — "${entities.description || 'task'}" for ${entities.dateKeyword || 'later'}. Database connection needed first.`
        ];
        return this.pickRandom(responses);
      }

      // Check if tasks table exists
      const tableCheck = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'chat_tasks'
        );
      `);

      if (!tableCheck.rows[0].exists) {
        // Create table if it doesn't exist
        await pool.query(`
          CREATE TABLE IF NOT EXISTS chat_tasks (
            id SERIAL PRIMARY KEY,
            user_id TEXT NOT NULL,
            organization_id TEXT NOT NULL,
            title TEXT NOT NULL,
            description TEXT,
            priority TEXT DEFAULT 'medium',
            status TEXT DEFAULT 'pending',
            due_date DATE,
            created_by TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
          
          CREATE INDEX IF NOT EXISTS idx_chat_tasks_user ON chat_tasks(user_id);
          CREATE INDEX IF NOT EXISTS idx_chat_tasks_status ON chat_tasks(status);
        `);
      }

      // Insert task
      const result = await pool.query(`
        INSERT INTO chat_tasks (user_id, organization_id, title, description, priority, due_date, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *;
      `, [
        userId,
        organizationId,
        entities.description || 'New Task',
        entities.description || '',
        entities.priority || 'medium',
        entities.date || null,
        username
      ]);

      const task = result.rows[0];
      const priorityEmoji = task.priority === 'high' || task.priority === 'urgent' ? '🔥' : 
                           task.priority === 'medium' ? '⭐' : '🌱';
      const dateStr = task.due_date 
        ? new Date(task.due_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
        : 'no specific deadline';
      
      // Multiple response variations
      const responses = [
        `I created the task: "${task.title}". It's due ${dateStr}. Anything else?`,
        `Task saved: "${task.title}". Due date is ${dateStr}. Need anything else?`,
        `Done — added "${task.title}" for ${dateStr}. What's next?`,
        `${priorityEmoji} Task "${task.title}" is set for ${dateStr}. Want to add another?`
      ];

      return humanizeText(this.pickRandom(responses));

    } catch (error) {
      console.error('[ChatService] Error creating task:', error);
      const errorResponses = [
        `Oops, I hit a snag creating that task. Can you try again?`,
        `Something didn't work right. Mind repeating that?`,
        `I ran into an issue saving the task. Let's try once more?`
      ];
      return this.pickRandom(errorResponses);
    }
  }

  /**
   * Pick random item from array
   */
  pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  /**
   * Get pending tasks
   */
  async getPendingTasks(userId) {
    try {
      if (!pool) {
        return [];
      }

      const result = await pool.query(`
        SELECT * FROM chat_tasks
        WHERE user_id = $1 AND status = 'pending'
        ORDER BY due_date ASC NULLS LAST, created_at DESC
        LIMIT 10;
      `, [userId]);

      return result.rows;
    } catch (error) {
      console.error('[ChatService] Error fetching tasks:', error);
      return [];
    }
  }

  /**
   * Format tasks list for display
   */
  formatTasksList(tasks) {
    if (!tasks || tasks.length === 0) {
      return "🎉 Awesome news! You're all caught up!\n\n" +
        "You have no pending tasks right now. Enjoy your free time! 😊\n\n" +
        "Want to create a new task or check something else?";
    }

    const taskWord = tasks.length === 1 ? 'task' : 'tasks';
    let message = `📋 **Here ${tasks.length === 1 ? 'is' : 'are'} your ${tasks.length} pending ${taskWord}:**\n\n`;
    
    tasks.forEach((task, index) => {
      const dueDate = task.due_date ? new Date(task.due_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : 'No deadline';
      const priority = task.priority === 'high' || task.priority === 'urgent' ? '�' : task.priority === 'medium' ? '⭐' : '🌱';
      const number = `${index + 1}.`;
      
      message += `${number} ${priority} **${task.title}**\n`;
      message += `   📅 ${dueDate} • 🆔 #${task.id}\n\n`;
    });

    message += `\n💡 **Tip:** You can update any task by saying "mark task #${tasks[0].id} as completed"`;

    return message;
  }

  /**
   * Get help message based on user role
   */
  getHelpMessage(userRole, username = 'there') {
    const greeting = `Hey ${username}! 👋 I'm here to help!\n\n`;
    
    const commands = [
      `🎯 **What I Can Do For You:**\n`,
      `📝 **Task Management:**`,
      `   • "Create a task for [description] tomorrow"`,
      `   • "Show my pending tasks"`,
      `   • "What tasks do I have?"`,
      `   • "Add urgent task for client meeting"\n`,
      `📦 **Inventory & Stock:**`,
      `   • "Check inventory status"`,
      `   • "Show stock levels"`,
      `   • "View warehouse details"\n`,
      `🏖️ **Leave Requests:**`,
      `   • "I need to request leave"`,
      `   • "Apply for vacation next week"`,
      `   • "Check my leave balance"\n`,
      `📊 **Reports & Insights:**`,
      `   • "Show my dashboard"`,
      `   • "What's my overview?"`,
      `   • "View analytics"\n`,
      `💡 **Pro Tips:**`,
      `   • Use natural language - just talk to me like a friend!`,
      `   • Mention dates: "today", "tomorrow", "next Monday", "next week"`,
      `   • Set priorities: "urgent", "high priority", "low priority"`,
      `   • Be specific for better results!\n`,
      `🌟 **Example Conversations:**`,
      `   • "Create a high priority task for inventory check tomorrow"`,
      `   • "Show all my pending tasks"`,
      `   • "I need to take leave next Friday"\n`,
      `Need anything else? Just ask! I'm always here to help! 😊`
    ];

    return greeting + commands.join('\n');
  }

  /**
   * Get suggested actions based on intent
   */
  getSuggestedActions(intent, userRole) {
    const actions = {
      'create_task': ['✅ View my tasks', '➕ Create another task', '📊 View dashboard'],
      'show_tasks': ['➕ Create new task', '📊 View dashboard', '🔄 Refresh tasks'],
      'greeting': ['➕ Create a task', '📋 View my tasks', '📦 Check inventory', '❓ Show help'],
      'help': ['➕ Create task', '📋 Show tasks', '📊 View dashboard'],
      'check_inventory': ['📦 View stock details', '📊 View dashboard', '➕ Create task'],
      'request_leave': ['📋 View my tasks', '📊 View dashboard', '🏖️ Check leave balance'],
      'error': ['🔄 Try again', '❓ Show help', '📋 View my tasks']
    };

    return actions[intent] || ['❓ Show help', '📋 View my tasks', '📊 View dashboard'];
  }

  /**
   * Get available intents for a role
   */
  getAvailableIntents(userRole) {
    const allIntents = [
      { name: 'create_task', description: 'Create a new task', requiredRole: 'employee' },
      { name: 'show_tasks', description: 'View your tasks', requiredRole: 'viewer' },
      { name: 'check_inventory', description: 'Check inventory', requiredRole: 'inventory-manager' },
      { name: 'request_leave', description: 'Request leave', requiredRole: 'employee' },
      { name: 'view_dashboard', description: 'View dashboard', requiredRole: 'viewer' }
    ];

    return allIntents.filter(intent => this.checkPermission(intent, userRole));
  }

  /**
   * Get conversation context
   */
  getContext(userId) {
    return this.contexts.get(userId) || {};
  }

  /**
   * Clear conversation context
   */
  clearContext(userId) {
    this.contexts.delete(userId);
  }

  /**
   * Get stats
   */
  getStats() {
    return {
      ...this.stats,
      activeContexts: this.contexts.size
    };
  }

  /**
   * Helper: Get next weekday
   */
  getNextWeekday(dayOfWeek) {
    const today = new Date();
    const currentDay = today.getDay();
    const daysUntil = (dayOfWeek - currentDay + 7) % 7 || 7;
    const nextDate = new Date(today);
    nextDate.setDate(today.getDate() + daysUntil);
    return nextDate;
  }
}

module.exports = ChatService;
