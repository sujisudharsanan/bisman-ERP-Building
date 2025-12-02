/**
 * =====================================================
 * UNIFIED CHAT ENGINE - Database-Driven with RBAC
 * =====================================================
 * Consolidates all chat implementations
 * Features:
 * - Database-driven responses (no JSON files)
 * - RBAC permission checking
 * - User data persistence
 * - Dynamic response generation
 * - Self-learning from corrections
 * - Spell checking with user corrections
 * =====================================================
 */

const natural = require('natural');
const compromise = require('compromise');
const { Pool } = require('pg');
require('dotenv').config();

// Import advanced features from old systems
const humanizeService = require('../chat/humanizeService');

// Database connection - Use DATABASE_URL if available (Railway), fallback to individual vars
const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    })
  : new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'BISMAN',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || '',
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });

class UnifiedChatEngine {
  constructor() {
    this.classifier = new natural.BayesClassifier();
    this.spellcheck = new natural.Spellcheck(['task', 'approval', 'report', 'create', 'list', 'show', 'update']);
    this.tokenizer = new natural.WordTokenizer();
    this.stemmer = natural.PorterStemmer;
    
    // Stats
    this.stats = {
      totalMessages: 0,
      totalCorrections: 0,
      totalTrainingExamples: 0
    };
    
    this.initialized = false;
  }

  /**
   * Initialize the chat engine
   */
  async init() {
    if (this.initialized) return;
    
    try {
      console.log('[UnifiedChat] 🚀 Initializing...');
      
      // Load training data from database
      await this.loadTrainingData();
      
      // Load common mistakes
      await this.loadCommonMistakes();
      
      // Train classifier
      await this.trainClassifier();
      
      this.initialized = true;
      console.log('[UnifiedChat] ✅ Initialized successfully');
      console.log(`[UnifiedChat] 📊 Loaded ${this.stats.totalTrainingExamples} training examples`);
    } catch (error) {
      console.error('[UnifiedChat] ❌ Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Load training data from database
   */
  async loadTrainingData() {
    try {
      const result = await pool.query(`
        SELECT pattern, intent, response_template, category, 
               requires_permission, priority, examples
        FROM chat_training_data
        WHERE is_active = true
        ORDER BY priority DESC
      `);
      
      this.trainingData = result.rows;
      this.stats.totalTrainingExamples = result.rows.length;
      
      console.log(`[UnifiedChat] 📚 Loaded ${result.rows.length} training patterns`);
    } catch (error) {
      console.error('[UnifiedChat] Error loading training data:', error);
      this.trainingData = [];
    }
  }

  /**
   * Load common spelling mistakes from database
   */
  async loadCommonMistakes() {
    try {
      const result = await pool.query(`
        SELECT incorrect_word, correct_word, frequency
        FROM chat_common_mistakes
        WHERE is_active = true
        ORDER BY frequency DESC
      `);
      
      this.commonMistakes = new Map();
      result.rows.forEach(row => {
        this.commonMistakes.set(row.incorrect_word.toLowerCase(), row.correct_word);
      });
      
      console.log(`[UnifiedChat] 📝 Loaded ${result.rows.length} common mistakes`);
    } catch (error) {
      console.error('[UnifiedChat] Error loading mistakes:', error);
      this.commonMistakes = new Map();
    }
  }

  /**
   * Train the Bayes classifier with training data
   */
  async trainClassifier() {
    try {
      this.trainingData.forEach(data => {
        if (data.examples && Array.isArray(data.examples)) {
          data.examples.forEach(example => {
            this.classifier.addDocument(example.toLowerCase(), data.intent);
          });
        }
        
        // Also add the pattern itself
        const patternExamples = data.pattern.split('|');
        patternExamples.forEach(pattern => {
          this.classifier.addDocument(pattern.toLowerCase(), data.intent);
        });
      });
      
      this.classifier.train();
      console.log('[UnifiedChat] 🧠 Classifier trained');
    } catch (error) {
      console.error('[UnifiedChat] Error training classifier:', error);
    }
  }

  /**
   * Check if user has permission for an action
   */
  async checkPermission(userId, permission) {
    if (!permission) return true; // No permission required
    
    try {
      const result = await pool.query(`
        SELECT check_chat_permission($1, $2) as has_permission
      `, [userId, permission]);
      
      return result.rows[0]?.has_permission || false;
    } catch (error) {
      console.error('[UnifiedChat] Permission check error:', error);
      return false;
    }
  }

  /**
   * Calculate math expressions from user message
   */
  calculateMath(message) {
    try {
      // Extract numbers and operators from the message
      const cleanMessage = message.toLowerCase()
        .replace(/what is/gi, '')
        .replace(/calculate/gi, '')
        .replace(/compute/gi, '')
        .replace(/solve/gi, '')
        .replace(/×/g, '*')
        .replace(/x(?=\s*\d)/gi, '*')
        .replace(/÷/g, '/')
        .replace(/plus/gi, '+')
        .replace(/minus/gi, '-')
        .replace(/times/gi, '*')
        .replace(/multiplied by/gi, '*')
        .replace(/divided by/gi, '/')
        .replace(/add/gi, '+')
        .replace(/subtract/gi, '-')
        .replace(/multiply/gi, '*')
        .replace(/divide/gi, '/')
        .replace(/sum of/gi, '')
        .replace(/difference of/gi, '')
        .replace(/product of/gi, '')
        .replace(/and/gi, '+')
        .trim();
      
      // Extract the math expression (numbers and operators only)
      const mathMatch = cleanMessage.match(/[\d\s+\-*/().]+/);
      if (!mathMatch) {
        return { success: false, error: 'No math expression found' };
      }
      
      let expression = mathMatch[0].trim();
      
      // Security: Only allow safe characters
      if (!/^[\d\s+\-*/().]+$/.test(expression)) {
        return { success: false, error: 'Invalid characters in expression' };
      }
      
      // Evaluate safely using Function (limited scope)
      const result = Function('"use strict"; return (' + expression + ')')();
      
      if (typeof result !== 'number' || !isFinite(result)) {
        return { success: false, error: 'Invalid result' };
      }
      
      // Format result nicely
      const formattedResult = Number.isInteger(result) ? result : parseFloat(result.toFixed(4));
      
      return {
        success: true,
        expression: expression.replace(/\s+/g, ' ').trim(),
        result: formattedResult
      };
    } catch (error) {
      console.error('[UnifiedChat] Math calculation error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Spell check and auto-correct message
   */
  async spellCheck(message) {
    let correctedMessage = message;
    const corrections = [];
    const words = this.tokenizer.tokenize(message.toLowerCase());
    
    words.forEach(word => {
      // Check against common mistakes database
      if (this.commonMistakes.has(word)) {
        const correct = this.commonMistakes.get(word);
        correctedMessage = correctedMessage.replace(new RegExp(`\\b${word}\\b`, 'gi'), correct);
        corrections.push({ incorrect: word, correct });
      }
    });
    
    return {
      original: message,
      corrected: correctedMessage,
      hasCorrections: corrections.length > 0,
      corrections
    };
  }

  /**
   * Extract entities from message using Compromise
   */
  extractEntities(message) {
    try {
      const doc = compromise(message);
      
      return {
        dates: doc.match('#Date').out('array'),
        numbers: doc.match('#Value').out('array'),
        places: doc.match('#Place').out('array'),
        people: doc.match('#Person').out('array'),
        topics: doc.topics().out('array')
      };
    } catch (error) {
      console.error('[UnifiedChat] Entity extraction error:', error);
      return {
        dates: [],
        numbers: [],
        places: [],
        people: [],
        topics: []
      };
    }
  }

  /**
   * Classify intent using pattern matching and Bayes
   */
  async classifyIntent(message) {
    const lowerMessage = message.toLowerCase();
    
    // 0. Check for math expressions first (high priority)
    const mathPatterns = [
      /\d+\s*[+\-*/×÷x]\s*\d+/i,  // "5 + 3", "10*2"
      /what\s+is\s+\d+/i,          // "what is 5..."
      /calculate\s+\d+/i,          // "calculate 5..."
      /\d+\s+(plus|minus|times|divided|multiplied)/i,  // "5 plus 3"
      /(add|subtract|multiply|divide)\s+\d+/i,         // "add 5 and 3"
      /sum\s+of\s+\d+/i,           // "sum of 5 and 3"
    ];
    
    for (const pattern of mathPatterns) {
      if (pattern.test(lowerMessage)) {
        return {
          intent: 'math',
          confidence: 0.98,
          method: 'math-pattern',
          requiresPermission: null,
          category: 'utility',
          responseTemplate: null
        };
      }
    }
    
    // 1. Try exact pattern matching first (higher priority)
    for (const data of this.trainingData) {
      const patterns = data.pattern.split('|');
      for (const pattern of patterns) {
        const regex = new RegExp(pattern.trim(), 'i');
        if (regex.test(lowerMessage)) {
          return {
            intent: data.intent,
            confidence: 0.95,
            method: 'pattern',
            requiresPermission: data.requires_permission,
            category: data.category,
            responseTemplate: data.response_template
          };
        }
      }
    }
    
    // 2. Use Bayes classifier as fallback
    const classifications = this.classifier.getClassifications(lowerMessage);
    const topClassification = classifications[0];
    
    if (topClassification && topClassification.value > 0.6) {
      const trainingData = this.trainingData.find(d => d.intent === topClassification.label);
      return {
        intent: topClassification.label,
        confidence: topClassification.value,
        method: 'bayes',
        requiresPermission: trainingData?.requires_permission,
        category: trainingData?.category,
        responseTemplate: trainingData?.response_template
      };
    }
    
    // 3. Unknown intent
    return {
      intent: 'unknown',
      confidence: 0,
      method: 'none',
      requiresPermission: null,
      category: 'general',
      responseTemplate: "I'm not sure I understand. Can you rephrase that?"
    };
  }

  /**
   * Get user preferences and context
   */
  async getUserContext(userId) {
    try {
      const result = await pool.query(`
        SELECT 
          cp.first_name,
          cp.last_visit,
          cp.visit_count,
          cp.preferred_language,
          cp.settings,
          u.username as name,
          u.email,
          u.role as role_name
        FROM chat_user_preferences cp
        JOIN users u ON cp.user_id = u.id
        WHERE cp.user_id = $1
      `, [userId]);
      
      if (result.rows.length === 0) {
        // Create preferences for new user
        const userResult = await pool.query(`
          SELECT id, username, email, role 
          FROM users 
          WHERE id = $1
        `, [userId]);
        
        if (userResult.rows.length > 0) {
          const user = userResult.rows[0];
          const firstName = user.username.split(' ')[0];
          
          await pool.query(`
            INSERT INTO chat_user_preferences (user_id, first_name, visit_count)
            VALUES ($1, $2, 0)
          `, [userId, firstName]);
          
          return {
            firstName,
            visitCount: 0,
            lastVisit: null,
            roleName: user.role,
            roleId: null,
            isNew: true
          };
        }
      }
      
      return {
        firstName: result.rows[0].first_name,
        visitCount: result.rows[0].visit_count,
        lastVisit: result.rows[0].last_visit,
        roleName: result.rows[0].role_name,
        roleId: null,
        settings: result.rows[0].settings || {},
        isNew: false
      };
    } catch (error) {
      console.error('[UnifiedChat] Error getting user context:', error);
      return {
        firstName: 'User',
        visitCount: 0,
        lastVisit: null,
        roleName: null,
        roleId: null,
        isNew: true
      };
    }
  }

  /**
   * Update user visit tracking
   */
  async updateUserVisit(userId) {
    try {
      await pool.query(`
        UPDATE chat_user_preferences
        SET last_visit = CURRENT_TIMESTAMP,
            visit_count = visit_count + 1
        WHERE user_id = $1
      `, [userId]);
    } catch (error) {
      console.error('[UnifiedChat] Error updating visit:', error);
    }
  }

  /**
   * Get pending tasks for user
   */
  async getPendingTasks(userId) {
    try {
      const result = await pool.query(`
        SELECT id, title, description, due_date, priority, status
        FROM tasks
        WHERE assigned_to = $1 
          AND status IN ('pending', 'in_progress')
        ORDER BY 
          CASE priority 
            WHEN 'urgent' THEN 1
            WHEN 'high' THEN 2
            WHEN 'medium' THEN 3
            ELSE 4
          END,
          due_date ASC
        LIMIT 5
      `, [userId]);
      
      return result.rows;
    } catch (error) {
      console.error('[UnifiedChat] Error fetching tasks:', error);
      return [];
    }
  }

  /**
   * Get pending approvals for user
   */
  async getPendingApprovals(userId) {
    try {
      const result = await pool.query(`
        SELECT id, request_type, requester_id, description, 
               created_at, priority
        FROM approval_requests
        WHERE approver_id = $1 
          AND status = 'pending'
        ORDER BY 
          CASE priority 
            WHEN 'urgent' THEN 1
            WHEN 'high' THEN 2
            WHEN 'medium' THEN 3
            ELSE 4
          END,
          created_at DESC
        LIMIT 5
      `, [userId]);
      
      return result.rows;
    } catch (error) {
      console.error('[UnifiedChat] Error fetching approvals:', error);
      return [];
    }
  }

  /**
   * Get new items since last visit
   */
  async getNewItemsSinceLastVisit(userId, lastVisit) {
    if (!lastVisit) return { tasks: 0, approvals: 0 };
    
    try {
      const [tasksResult, approvalsResult] = await Promise.all([
        pool.query(`
          SELECT COUNT(*) as count
          FROM tasks
          WHERE assigned_to = $1 
            AND created_at > $2
        `, [userId, lastVisit]),
        pool.query(`
          SELECT COUNT(*) as count
          FROM approval_requests
          WHERE approver_id = $1 
            AND created_at > $2
            AND status = 'pending'
        `, [userId, lastVisit])
      ]);
      
      return {
        tasks: parseInt(tasksResult.rows[0].count) || 0,
        approvals: parseInt(approvalsResult.rows[0].count) || 0
      };
    } catch (error) {
      console.error('[UnifiedChat] Error fetching new items:', error);
      return { tasks: 0, approvals: 0 };
    }
  }

  /**
   * Generate personalized greeting
   */
  async generateGreeting(userId) {
    const userContext = await this.getUserContext(userId);
    const { firstName, visitCount, lastVisit, isNew } = userContext;
    
    let greeting = `Hello ${firstName}! `;
    
    if (isNew || visitCount === 0) {
      greeting += "Welcome! I'm your AI assistant. I can help you with tasks, approvals, reports, and more.";
      greeting = humanizeService.humanize(greeting, { userName: firstName, tone: 'friendly' });
    } else {
      const newItems = await this.getNewItemsSinceLastVisit(userId, lastVisit);
      
      if (newItems.tasks > 0 || newItems.approvals > 0) {
        greeting += `Welcome back! Since your last visit, you have:\n`;
        if (newItems.tasks > 0) {
          greeting += `• ${newItems.tasks} new task(s)\n`;
        }
        if (newItems.approvals > 0) {
          greeting += `• ${newItems.approvals} pending approval(s)\n`;
        }
        greeting = humanizeService.humanize(greeting, { userName: firstName, tone: 'friendly' });
      } else {
        greeting += `Welcome back! Everything looks good. How can I help you today?`;
        greeting = humanizeService.humanize(greeting, { userName: firstName, tone: 'friendly' });
      }
    }
    
    // Update visit
    await this.updateUserVisit(userId);
    
    return {
      greeting,
      userContext,
      newItems: isNew ? null : await this.getNewItemsSinceLastVisit(userId, lastVisit)
    };
  }

  /**
   * Generate dynamic response based on intent
   */
  async generateResponse(userId, intent, message, userContext) {
    const { firstName, roleName } = userContext;
    
    // Get the training data for this intent
    const intentData = this.trainingData.find(d => d.intent === intent);
    
    // Check permissions
    if (intentData?.requires_permission) {
      const hasPermission = await this.checkPermission(userId, intentData.requires_permission);
      if (!hasPermission) {
        const featureName = intentData.category || intent.replace(/_/g, ' ');
        const requiredRole = intentData.requires_permission || 'higher access';
        return {
          response: humanizeService.formatPermissionDenied(firstName, featureName, requiredRole, roleName),
          requiresPermission: intentData.requires_permission,
          hasPermission: false,
          data: null
        };
      }
    }
    
    let response = intentData?.response_template || "I understand. How can I assist you?";
    let responseData = null;
    
    // Replace placeholders
    response = response.replace('{firstName}', firstName);
    response = response.replace('{roleName}', roleName || 'your role');
    response = response.replace('{time}', new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }));
    response = response.replace('{date}', new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }));
    
    // Helper to safely get reply from humanizeService (which returns an object)
    const humanize = (text, opts = {}) => {
      const result = humanizeService.formatHumanReply({ 
        baseText: text, 
        userName: opts.userName || firstName, 
        intent: opts.intent || intent,
        confidence: 0.9 
      });
      return typeof result === 'string' ? result : (result?.reply || text);
    };
    
    // Execute intent-specific actions
    switch (intent) {
      case 'list_tasks':
      case 'list_pending_tasks':
        const tasks = await this.getPendingTasks(userId);
        responseData = { tasks };
        if (tasks.length > 0) {
          response += `\n\n📋 You have ${tasks.length} pending task(s):`;
          tasks.forEach((task, idx) => {
            response += `\n${idx + 1}. ${task.title} (${task.priority} priority)`;
          });
          response = humanize(response);
        } else {
          const noTasksMsg = `Great news ${firstName}! You have no pending tasks. 🎉`;
          response = humanize(noTasksMsg);
        }
        break;
        
      case 'list_approvals':
        const approvals = await this.getPendingApprovals(userId);
        responseData = { approvals };
        if (approvals.length > 0) {
          response += `\n\n✅ You have ${approvals.length} pending approval(s):`;
          approvals.forEach((approval, idx) => {
            response += `\n${idx + 1}. ${approval.request_type} - ${approval.description || 'No description'}`;
          });
          response = humanize(response);
        } else {
          const noApprovalsMsg = `You're all caught up ${firstName}! No pending approvals. 🎉`;
          response = humanize(noApprovalsMsg);
        }
        break;
        
      case 'greeting':
        // Already handled by generateGreeting
        break;
        
      case 'help':
        response += `\n\nYou can ask me to:\n• "Show my tasks"\n• "List pending approvals"\n• "Create a task"\n• "Show reports"\n• "Calculate 25 + 17"\n• And much more!`;
        response = humanize(response, { intent: 'help' });
        break;
      
      case 'math':
        // Extract and calculate math expression from message
        const mathResult = this.calculateMath(message);
        if (mathResult.success) {
          response = `🧮 ${mathResult.expression} = **${mathResult.result}**`;
        } else {
          response = `I couldn't calculate that. Try something like "what is 25 + 17" or "calculate 100 / 5"`;
        }
        break;
        
      default:
        // Humanize all other responses
        response = humanize(response);
        break;
    }
    
    return {
      response,
      requiresPermission: intentData?.requires_permission,
      hasPermission: true,
      data: responseData
    };
  }

  /**
   * Process user message - MAIN ENTRY POINT
   */
  async processMessage(userId, message, conversationId = null) {
    try {
      const startTime = Date.now();
      this.stats.totalMessages++;
      
      // Ensure initialized
      if (!this.initialized) {
        await this.init();
      }
      
      // Get user context
      const userContext = await this.getUserContext(userId);
      
      // Spell check
      const spellCheckResult = await this.spellCheck(message);
      const messageToProcess = spellCheckResult.corrected;
      
      // Extract entities
      const entities = this.extractEntities(messageToProcess);
      
      // Classify intent
      const intentResult = await this.classifyIntent(messageToProcess);
      const { intent, confidence, requiresPermission } = intentResult;
      
      // Generate response
      const responseResult = await this.generateResponse(
        userId, 
        intent, 
        messageToProcess, 
        userContext
      );
      
      // Create or get conversation
      // Only use conversationId if it's a valid integer (not a session string)
      let actualConversationId = null;
      if (conversationId && !isNaN(parseInt(conversationId)) && !String(conversationId).includes('session')) {
        actualConversationId = parseInt(conversationId);
      }
      
      if (!actualConversationId) {
        const convResult = await pool.query(`
          INSERT INTO chat_conversations (user_id, title, context_type)
          VALUES ($1, $2, $3)
          RETURNING id
        `, [userId, `Chat - ${new Date().toLocaleDateString()}`, intentResult.category || 'general']);
        actualConversationId = convResult.rows[0].id;
      }
      
      // Save user message
      const userMsgResult = await pool.query(`
        INSERT INTO chat_messages (
          conversation_id, user_id, role, content, 
          intent, entities, response_metadata
        )
        VALUES ($1, $2, 'user', $3, $4, $5, $6)
        RETURNING id
      `, [
        actualConversationId, 
        userId, 
        message, 
        intent, 
        JSON.stringify(entities),
        JSON.stringify({ spellCheck: spellCheckResult })
      ]);
      
      // Save assistant response
      const assistantMsgResult = await pool.query(`
        INSERT INTO chat_messages (
          conversation_id, user_id, role, content,
          intent, response_metadata
        )
        VALUES ($1, $2, 'assistant', $3, $4, $5)
        RETURNING id
      `, [
        actualConversationId,
        userId,
        responseResult.response,
        intent,
        JSON.stringify({
          confidence,
          method: intentResult.method,
          data: responseResult.data
        })
      ]);
      
      // Log analytics
      const responseTime = Date.now() - startTime;
      await pool.query(`
        INSERT INTO chat_analytics (
          user_id, role_id, conversation_id, event_type,
          intent, success, response_time_ms, metadata
        )
        VALUES ($1, $2, $3, 'response_generated', $4, $5, $6, $7)
      `, [
        userId,
        userContext.roleId,
        actualConversationId,
        intent,
        true,
        responseTime,
        JSON.stringify({ confidence, method: intentResult.method })
      ]);
      
      return {
        response: responseResult.response,
        intent,
        confidence,
        spellCheck: spellCheckResult,
        entities,
        conversationId: actualConversationId,
        messageId: assistantMsgResult.rows[0].id,
        hasPermission: responseResult.hasPermission,
        data: responseResult.data,
        stats: {
          responseTime,
          totalMessages: this.stats.totalMessages
        }
      };
      
    } catch (error) {
      console.error('[UnifiedChat] Process message error:', error);
      return {
        response: "I'm sorry, I encountered an error processing your message. Please try again.",
        error: error.message,
        intent: 'error',
        confidence: 0
      };
    }
  }

  /**
   * Store user correction
   */
  async storeCorrection(userId, messageId, originalMessage, correctedMessage, originalIntent, correctedIntent) {
    try {
      this.stats.totalCorrections++;
      
      // Store in corrections table
      await pool.query(`
        INSERT INTO chat_user_corrections (
          user_id, original_message, corrected_message,
          original_intent, corrected_intent, context, learned
        )
        VALUES ($1, $2, $3, $4, $5, $6, false)
      `, [
        userId,
        originalMessage,
        correctedMessage,
        originalIntent,
        correctedIntent,
        JSON.stringify({ messageId, timestamp: new Date() })
      ]);
      
      // Update message as correction
      await pool.query(`
        UPDATE chat_messages
        SET is_correction = true,
            corrected_from = $1
        WHERE id = $2
      `, [originalMessage, messageId]);
      
      // Add to training data if new pattern
      if (correctedIntent && correctedIntent !== originalIntent) {
        await pool.query(`
          INSERT INTO chat_training_data (
            pattern, intent, response_template, category,
            examples, created_by, priority
          )
          VALUES ($1, $2, $3, 'user_generated', $4, $5, 50)
          ON CONFLICT DO NOTHING
        `, [
          correctedMessage.toLowerCase(),
          correctedIntent,
          'Processing your request...',
          JSON.stringify([correctedMessage]),
          userId
        ]);
      }
      
      // Reload training data
      await this.loadTrainingData();
      await this.trainClassifier();
      
      console.log(`[UnifiedChat] ✅ Learned from correction: "${originalMessage}" → "${correctedMessage}"`);
      
      return { success: true, learned: true };
    } catch (error) {
      console.error('[UnifiedChat] Error storing correction:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Submit feedback
   */
  async submitFeedback(userId, messageId, helpful, feedbackType = 'thumbs_up', comment = null) {
    try {
      await pool.query(`
        INSERT INTO chat_feedback (message_id, user_id, helpful, feedback_type, comment)
        VALUES ($1, $2, $3, $4, $5)
      `, [messageId, userId, helpful, feedbackType, comment]);
      
      // Update message feedback
      await pool.query(`
        UPDATE chat_messages
        SET feedback = $1
        WHERE id = $2
      `, [helpful ? 'positive' : 'negative', messageId]);
      
      // Log analytics
      await pool.query(`
        INSERT INTO chat_analytics (
          user_id, conversation_id, event_type, metadata
        )
        VALUES (
          $1, 
          (SELECT conversation_id FROM chat_messages WHERE id = $2),
          'feedback_given',
          $3
        )
      `, [userId, messageId, JSON.stringify({ helpful, feedbackType })]);
      
      return { success: true };
    } catch (error) {
      console.error('[UnifiedChat] Error submitting feedback:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get user's conversation history
   */
  async getUserHistory(userId, limit = 50) {
    try {
      const result = await pool.query(`
        SELECT 
          cm.id,
          cm.conversation_id,
          cm.role,
          cm.content,
          cm.intent,
          cm.entities,
          cm.feedback,
          cm.is_correction,
          cm.created_at,
          cc.title as conversation_title
        FROM chat_messages cm
        JOIN chat_conversations cc ON cm.conversation_id = cc.id
        WHERE cm.user_id = $1
        ORDER BY cm.created_at DESC
        LIMIT $2
      `, [userId, limit]);
      
      return result.rows;
    } catch (error) {
      console.error('[UnifiedChat] Error fetching history:', error);
      return [];
    }
  }

  /**
   * Get analytics
   */
  async getAnalytics(userId = null, dateRange = '7 days') {
    try {
      const query = userId 
        ? `SELECT * FROM v_user_chat_summary WHERE user_id = $1`
        : `SELECT * FROM v_chat_intent_analytics LIMIT 50`;
      
      const result = await pool.query(query, userId ? [userId] : []);
      return result.rows;
    } catch (error) {
      console.error('[UnifiedChat] Error fetching analytics:', error);
      return [];
    }
  }
}

// Singleton instance
let unifiedChatInstance = null;

function getUnifiedChat() {
  if (!unifiedChatInstance) {
    unifiedChatInstance = new UnifiedChatEngine();
  }
  return unifiedChatInstance;
}

module.exports = {
  UnifiedChatEngine,
  getUnifiedChat
};
