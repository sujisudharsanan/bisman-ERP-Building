/**
 * Chat Service
 * Main orchestrator for intelligent chat processing
 */

import { intentService, Intent } from './intentService';
import { fuzzyService } from './fuzzyService';
import { entityService, EntityExtractionResult } from './entityService';
import { taskService } from './taskService';
import { rbacService, UserRole } from './rbacService';
import { formatDate, combineDateTime } from '../../utils/dateParser';

export type NextAction = 'ASK_CLARIFICATION' | 'EXECUTE' | 'FALLBACK' | 'SUGGEST_OPTIONS' | 'PERMISSION_DENIED';

export interface ChatResponse {
  reply: string;
  intent: string;
  confidence: number;
  entities: EntityExtractionResult;
  nextAction: NextAction;
  suggestions?: string[];
  data?: any;
  requiresAuth?: boolean;
  permissionDenied?: boolean;
}

export interface ConversationContext {
  userId: number;
  userRole?: UserRole;
  previousIntent?: Intent;
  previousEntities?: EntityExtractionResult;
  awaitingConfirmation?: boolean;
  conversationHistory: Array<{
    message: string;
    intent: Intent;
    timestamp: Date;
  }>;
}

export class ChatService {
  private contexts: Map<number, ConversationContext> = new Map();

  /**
   * Main message handler with RBAC support
   */
  async handleMessage(userId: number, text: string, userRole?: UserRole): Promise<ChatResponse> {
    try {
      // Get or create conversation context
      const context = this.getContext(userId);
      if (userRole) {
        context.userRole = userRole;
      }

      // Store message in history
      this.addToHistory(context, text);

      // Step 1: Correct typos using fuzzy matching
      const correctionResult = fuzzyService.getCorrectionSuggestions(text);
      const cleanedText = correctionResult.corrected;

      // Step 2: Detect intent
      const intentResult = intentService.detectIntent(cleanedText);
      
      // Step 3: Extract entities
      const entities = entityService.extractEntities(cleanedText);

      // Step 4: Check RBAC permissions if user role is provided
      if (userRole && intentResult.confidence >= 0.6) {
        const permissionCheck = await rbacService.hasPermission(
          { id: userId, role: userRole },
          intentResult.intent as Intent,
          { entities }
        );

        if (!permissionCheck.allowed) {
          return {
            reply: rbacService.getPermissionErrorMessage(intentResult.intent as Intent, userRole),
            intent: intentResult.intent,
            confidence: intentResult.confidence,
            entities,
            nextAction: 'PERMISSION_DENIED',
            permissionDenied: true,
          };
        }
      }

      // Step 5: Determine next action based on confidence
      let nextAction: NextAction;
      let response: ChatResponse;

      if (intentResult.confidence < 0.6) {
        // Low confidence - ask clarifying question or suggest options
        nextAction = 'ASK_CLARIFICATION';
        response = this.handleLowConfidence(intentResult, entities, text, userRole);
      } else if (intentResult.confidence >= 0.6 && intentResult.confidence < 0.85) {
        // Medium confidence - provide suggestion options
        nextAction = 'SUGGEST_OPTIONS';
        response = this.handleMediumConfidence(intentResult, entities, text);
      } else {
        // High confidence - execute intent
        nextAction = 'EXECUTE';
        response = await this.executeIntent(userId, intentResult.intent as Intent, entities, cleanedText);
      }

      // Update context
      context.previousIntent = intentResult.intent as Intent;
      context.previousEntities = entities;

      return {
        ...response,
        confidence: intentResult.confidence,
        nextAction,
      };
    } catch (error) {
      console.error('Error handling message:', error);
      return this.createFallbackResponse(text);
    }
  }

  /**
   * Handle low confidence (< 0.6)
   */
  private handleLowConfidence(
    intentResult: any,
    entities: EntityExtractionResult,
    originalText: string,
    userRole?: UserRole
  ): ChatResponse {
    // Get top 3 possible intents
    let suggestions = intentService.getSuggestedIntents(originalText, 3);

    // Filter by user role if provided
    if (userRole) {
      const allowedIntents = rbacService.getAllowedIntents(userRole);
      suggestions = suggestions.filter(s => allowedIntents.includes(s.intent as Intent));
    }

    const suggestionTexts = suggestions.map((s, i) => 
      `${i + 1}) ${this.getIntentActionText(s.intent as Intent)}`
    );

    return {
      reply: `I didn't fully understand that. Did you mean:\n${suggestionTexts.join('\n')}\n\nOr you can tell me more.`,
      intent: intentResult.intent,
      confidence: intentResult.confidence,
      entities,
      nextAction: 'ASK_CLARIFICATION',
      suggestions: suggestions.map(s => s.intent),
    };
  }

  /**
   * Handle medium confidence (0.6 - 0.85)
   */
  private handleMediumConfidence(
    intentResult: any,
    entities: EntityExtractionResult,
    originalText: string
  ): ChatResponse {
    const intentName = intentService.getIntentDisplayName(intentResult.intent as Intent);
    
    return {
      reply: `I think you want to ${this.getIntentActionText(intentResult.intent as Intent)}. Is that correct? (Yes/No)`,
      intent: intentResult.intent,
      confidence: intentResult.confidence,
      entities,
      nextAction: 'SUGGEST_OPTIONS',
      suggestions: ['Yes', 'No'],
    };
  }

  /**
   * Execute intent with high confidence
   */
  private async executeIntent(
    userId: number,
    intent: Intent,
    entities: EntityExtractionResult,
    text: string
  ): Promise<ChatResponse> {
    switch (intent) {
      case 'create_task':
        return await this.handleCreateTask(userId, entities, text);
      
      case 'show_pending_tasks':
        return await this.handleShowPendingTasks(userId);
      
      case 'create_payment_request':
        return this.handleCreatePaymentRequest(entities);
      
      case 'check_inventory':
        return this.handleCheckInventory(entities);
      
      case 'check_attendance':
        return this.handleCheckAttendance(userId);
      
      case 'request_leave':
        return this.handleRequestLeave(userId, entities);
      
      case 'view_dashboard':
        return this.handleViewDashboard();
      
      case 'search_user':
        return this.handleSearchUser(entities);
      
      case 'get_approval_status':
        return this.handleGetApprovalStatus(userId, entities);
      
      case 'view_reports':
        return this.handleViewReports(entities);
      
      case 'salary_info':
        return this.handleSalaryInfo(userId);
      
      case 'vehicle_info':
        return this.handleVehicleInfo(entities);
      
      case 'hub_info':
        return this.handleHubInfo(entities);
      
      case 'fuel_expense':
        return this.handleFuelExpense(entities);
      
      case 'vendor_payments':
        return this.handleVendorPayments(entities);
      
      case 'schedule_meeting':
        return this.handleScheduleMeeting(userId, entities);
      
      case 'check_notifications':
        return this.handleCheckNotifications(userId);
      
      case 'update_profile':
        return this.handleUpdateProfile(userId);
      
      default:
        return this.createFallbackResponse(text);
    }
  }

  /**
   * Handle: Create Task
   */
  private async handleCreateTask(
    userId: number,
    entities: EntityExtractionResult,
    text: string
  ): Promise<ChatResponse> {
    try {
      // Extract task description
      const description = entityService.extractTaskDescription(text);
      
      // Combine date and time if both present
      let dueDate: Date | undefined;
      if (entities.date) {
        if (entities.time) {
          dueDate = combineDateTime(entities.date, entities.time);
        } else {
          dueDate = entities.date;
        }
      }

      // Create task
      const task = await taskService.createTask({
        userId,
        description,
        dueDate,
        priority: entities.priority || 'medium',
        source: 'chat',
        metadata: {
          originalMessage: text,
          entities,
        },
      });

      const dueDateStr = dueDate ? ` for ${formatDate(dueDate, 'relative')}${entities.time ? ` at ${entities.time}` : ''}` : '';
      
      return {
        reply: `✅ Task created successfully${dueDateStr}!\n\n📝 "${description}"\n🆔 Task ID: ${task.id}\n⚡ Priority: ${task.priority.toUpperCase()}`,
        intent: 'create_task',
        confidence: 1.0,
        entities,
        nextAction: 'EXECUTE',
        data: { task },
      };
    } catch (error) {
      return {
        reply: '❌ Sorry, I couldn\'t create the task. Please try again.',
        intent: 'create_task',
        confidence: 1.0,
        entities,
        nextAction: 'FALLBACK',
      };
    }
  }

  /**
   * Handle: Show Pending Tasks
   */
  private async handleShowPendingTasks(userId: number): Promise<ChatResponse> {
    try {
      const tasks = await taskService.getPendingTasks(userId, 5);
      const stats = await taskService.getTaskStats(userId);

      if (tasks.length === 0) {
        return {
          reply: '🎉 You have no pending tasks! Great job staying on top of things.',
          intent: 'show_pending_tasks',
          confidence: 1.0,
          entities: { raw: {} },
          nextAction: 'EXECUTE',
          data: { tasks, stats },
        };
      }

      const taskList = tasks.map((task, i) => {
        const dueStr = task.due_date ? ` - Due: ${formatDate(task.due_date, 'relative')}` : '';
        const priorityEmoji = task.priority === 'urgent' ? '🔴' : task.priority === 'high' ? '🟠' : task.priority === 'medium' ? '🟡' : '🟢';
        return `${i + 1}. ${priorityEmoji} ${task.description}${dueStr}`;
      }).join('\n');

      return {
        reply: `📋 Your Pending Tasks (${stats.pending} total):\n\n${taskList}\n\n${stats.overdue > 0 ? `⚠️ ${stats.overdue} task(s) overdue\n` : ''}${stats.dueToday > 0 ? `📅 ${stats.dueToday} task(s) due today` : ''}`,
        intent: 'show_pending_tasks',
        confidence: 1.0,
        entities: { raw: {} },
        nextAction: 'EXECUTE',
        data: { tasks, stats },
      };
    } catch (error) {
      return {
        reply: '❌ Sorry, I couldn\'t fetch your tasks. Please try again.',
        intent: 'show_pending_tasks',
        confidence: 1.0,
        entities: { raw: {} },
        nextAction: 'FALLBACK',
      };
    }
  }

  /**
   * Handle: Create Payment Request
   */
  private handleCreatePaymentRequest(entities: EntityExtractionResult): ChatResponse {
    const amount = entities.amount ? `₹${entities.amount.toLocaleString()}` : 'unspecified';
    const vendor = entities.vendorName || entities.userName || 'vendor';
    const invoice = entities.invoiceId || 'new';

    return {
      reply: `💰 Creating payment request:\n\n💵 Amount: ${amount}\n👤 Vendor: ${vendor}\n📄 Invoice: ${invoice}\n\n✅ Payment request will be submitted for approval.`,
      intent: 'create_payment_request',
      confidence: 1.0,
      entities,
      nextAction: 'EXECUTE',
      requiresAuth: true,
      data: { amount: entities.amount, vendor, invoice },
    };
  }

  /**
   * Handle: Check Inventory
   */
  private handleCheckInventory(entities: EntityExtractionResult): ChatResponse {
    const location = entities.location || 'all locations';
    
    return {
      reply: `📦 Checking inventory at ${location}...\n\nℹ️ This will open the inventory dashboard with current stock levels.`,
      intent: 'check_inventory',
      confidence: 1.0,
      entities,
      nextAction: 'EXECUTE',
      requiresAuth: true,
    };
  }

  /**
   * Handle: Check Attendance
   */
  private handleCheckAttendance(userId: number): ChatResponse {
    return {
      reply: '📅 Opening your attendance record...\n\nℹ️ You can view your attendance history, present days, and leave balance.',
      intent: 'check_attendance',
      confidence: 1.0,
      entities: { raw: {} },
      nextAction: 'EXECUTE',
      requiresAuth: true,
    };
  }

  /**
   * Handle: Request Leave
   */
  private handleRequestLeave(userId: number, entities: EntityExtractionResult): ChatResponse {
    const leaveType = entities.leaveType || 'casual';
    const fromDate = entities.date ? formatDate(entities.date, 'short') : 'today';
    const duration = entities.duration ? `${entities.duration.value} ${entities.duration.unit}(s)` : '1 day';

    return {
      reply: `🏖️ Leave Request:\n\n📋 Type: ${leaveType}\n📅 From: ${fromDate}\n⏱️ Duration: ${duration}\n\n✅ Your leave request will be submitted for approval.`,
      intent: 'request_leave',
      confidence: 1.0,
      entities,
      nextAction: 'EXECUTE',
      requiresAuth: true,
      data: { leaveType, fromDate, duration },
    };
  }

  /**
   * Handle: View Dashboard
   */
  private handleViewDashboard(): ChatResponse {
    return {
      reply: '🏠 Opening dashboard...',
      intent: 'view_dashboard',
      confidence: 1.0,
      entities: { raw: {} },
      nextAction: 'EXECUTE',
    };
  }

  /**
   * Handle: Search User
   */
  private handleSearchUser(entities: EntityExtractionResult): ChatResponse {
    const userName = entities.userName || 'user';
    
    return {
      reply: `🔍 Searching for user: "${userName}"...`,
      intent: 'search_user',
      confidence: 1.0,
      entities,
      nextAction: 'EXECUTE',
      requiresAuth: true,
      data: { userName },
    };
  }

  /**
   * Handle: Get Approval Status
   */
  private handleGetApprovalStatus(userId: number, entities: EntityExtractionResult): ChatResponse {
    const requestId = entities.invoiceId || 'latest';
    
    return {
      reply: `📋 Checking approval status for request: ${requestId}...`,
      intent: 'get_approval_status',
      confidence: 1.0,
      entities,
      nextAction: 'EXECUTE',
      requiresAuth: true,
    };
  }

  /**
   * Handle: View Reports
   */
  private handleViewReports(entities: EntityExtractionResult): ChatResponse {
    return {
      reply: '📊 Opening reports dashboard...\n\nℹ️ You can view sales, expenses, attendance, and other analytics.',
      intent: 'view_reports',
      confidence: 1.0,
      entities,
      nextAction: 'EXECUTE',
      requiresAuth: true,
    };
  }

  /**
   * Handle: Salary Info
   */
  private handleSalaryInfo(userId: number): ChatResponse {
    return {
      reply: '💰 Opening your salary information...\n\nℹ️ You can view payslips, deductions, and payment history.',
      intent: 'salary_info',
      confidence: 1.0,
      entities: { raw: {} },
      nextAction: 'EXECUTE',
      requiresAuth: true,
    };
  }

  /**
   * Handle: Vehicle Info
   */
  private handleVehicleInfo(entities: EntityExtractionResult): ChatResponse {
    const vehicleId = entities.vehicleId || 'your vehicle';
    
    return {
      reply: `🚗 Fetching information for ${vehicleId}...`,
      intent: 'vehicle_info',
      confidence: 1.0,
      entities,
      nextAction: 'EXECUTE',
      requiresAuth: true,
    };
  }

  /**
   * Handle: Hub Info
   */
  private handleHubInfo(entities: EntityExtractionResult): ChatResponse {
    const location = entities.location || entities.hubId ? `Hub ${entities.hubId}` : 'all hubs';
    
    return {
      reply: `🏢 Fetching information for ${location}...`,
      intent: 'hub_info',
      confidence: 1.0,
      entities,
      nextAction: 'EXECUTE',
      requiresAuth: true,
    };
  }

  /**
   * Handle: Fuel Expense
   */
  private handleFuelExpense(entities: EntityExtractionResult): ChatResponse {
    const amount = entities.amount ? `₹${entities.amount.toLocaleString()}` : 'amount';
    
    return {
      reply: `⛽ Recording fuel expense of ${amount}...`,
      intent: 'fuel_expense',
      confidence: 1.0,
      entities,
      nextAction: 'EXECUTE',
      requiresAuth: true,
    };
  }

  /**
   * Handle: Vendor Payments
   */
  private handleVendorPayments(entities: EntityExtractionResult): ChatResponse {
    const vendor = entities.vendorName || 'vendor';
    
    return {
      reply: `💳 Fetching payment information for ${vendor}...`,
      intent: 'vendor_payments',
      confidence: 1.0,
      entities,
      nextAction: 'EXECUTE',
      requiresAuth: true,
    };
  }

  /**
   * Handle: Schedule Meeting
   */
  private handleScheduleMeeting(userId: number, entities: EntityExtractionResult): ChatResponse {
    const dateStr = entities.date ? formatDate(entities.date, 'short') : 'unspecified date';
    const timeStr = entities.time || 'unspecified time';
    
    return {
      reply: `📅 Scheduling meeting for ${dateStr} at ${timeStr}...`,
      intent: 'schedule_meeting',
      confidence: 1.0,
      entities,
      nextAction: 'EXECUTE',
      requiresAuth: true,
    };
  }

  /**
   * Handle: Check Notifications
   */
  private handleCheckNotifications(userId: number): ChatResponse {
    return {
      reply: '🔔 Opening your notifications...',
      intent: 'check_notifications',
      confidence: 1.0,
      entities: { raw: {} },
      nextAction: 'EXECUTE',
      requiresAuth: true,
    };
  }

  /**
   * Handle: Update Profile
   */
  private handleUpdateProfile(userId: number): ChatResponse {
    return {
      reply: '👤 Opening profile settings...',
      intent: 'update_profile',
      confidence: 1.0,
      entities: { raw: {} },
      nextAction: 'EXECUTE',
      requiresAuth: true,
    };
  }

  /**
   * Create fallback response
   */
  private createFallbackResponse(text: string): ChatResponse {
    return {
      reply: `I'm not sure I understand. Here are some things I can help with:

📋 Task Management: "create a task", "show my tasks"
💰 Payments: "create payment request", "check payment status"
📦 Inventory: "check inventory"
👥 HR: "check attendance", "request leave", "salary info"
🚗 Operations: "vehicle info", "hub info", "fuel expense"
📊 Reports: "view reports", "dashboard"

What would you like to do?`,
      intent: 'unknown',
      confidence: 0,
      entities: { raw: {} },
      nextAction: 'FALLBACK',
      suggestions: [
        'Create task',
        'Show pending tasks',
        'Check inventory',
        'View dashboard',
      ],
    };
  }

  /**
   * Get context for user
   */
  private getContext(userId: number): ConversationContext {
    if (!this.contexts.has(userId)) {
      this.contexts.set(userId, {
        userId,
        conversationHistory: [],
      });
    }
    return this.contexts.get(userId)!;
  }

  /**
   * Add message to history
   */
  private addToHistory(context: ConversationContext, message: string): void {
    const intentResult = intentService.detectIntent(message);
    context.conversationHistory.push({
      message,
      intent: intentResult.intent as Intent,
      timestamp: new Date(),
    });

    // Keep only last 10 messages
    if (context.conversationHistory.length > 10) {
      context.conversationHistory.shift();
    }
  }

  /**
   * Get intent action text for user display
   */
  private getIntentActionText(intent: Intent): string {
    const actions: Record<Intent, string> = {
      show_pending_tasks: 'Show pending tasks',
      create_task: 'Create a new task',
      create_payment_request: 'Create payment request',
      check_inventory: 'Check inventory',
      check_attendance: 'Check attendance',
      request_leave: 'Request leave',
      view_dashboard: 'View dashboard',
      search_user: 'Search for a user',
      get_approval_status: 'Get approval status',
      view_reports: 'View reports',
      salary_info: 'View salary information',
      vehicle_info: 'View vehicle information',
      hub_info: 'View hub information',
      fuel_expense: 'Record fuel expense',
      vendor_payments: 'Check vendor payments',
      schedule_meeting: 'Schedule a meeting',
      check_notifications: 'Check notifications',
      update_profile: 'Update profile',
      unknown: 'Something else',
    };

    return actions[intent] || 'Perform an action';
  }

  /**
   * Clear context for user
   */
  clearContext(userId: number): void {
    this.contexts.delete(userId);
  }

  /**
   * Get conversation history
   */
  getHistory(userId: number): ConversationContext['conversationHistory'] {
    const context = this.getContext(userId);
    return context.conversationHistory;
  }
}

export const chatService = new ChatService();
