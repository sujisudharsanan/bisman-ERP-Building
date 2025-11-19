/**
 * =====================================================
 * ULTIMATE ENHANCED CHAT SERVICE - All Features Combined
 * =====================================================
 * Integrates:
 * 1. NLP: Intent detection, entity extraction, fuzzy matching
 * 2. Database: PostgreSQL for training data, user context
 * 3. Self-Learning: Interaction logging, auto-flagging
 * 4. Human-like: Empathetic responses, repeated question handling
 * 5. RBAC: Permission checking, role-based suggestions
 * =====================================================
 */

import { Pool } from 'pg';
import { intentService, Intent } from './intentService';
import { fuzzyService } from './fuzzyService';
import { entityService, EntityExtractionResult } from './entityService';
import { taskService } from './taskService';
import { rbacService, UserRole } from './rbacService';
import { interactionLogger } from './interactionLogger';
import { humanLikeResponse } from './humanLikeResponse';
import { v4 as uuidv4 } from 'uuid';

const natural = require('natural');
const compromise = require('compromise');

export type NextAction = 
  | 'ASK_CLARIFICATION' 
  | 'EXECUTE' 
  | 'FALLBACK' 
  | 'SUGGEST_OPTIONS' 
  | 'PERMISSION_DENIED'
  | 'REPEATED_QUESTION'
  | 'ESCALATE';

export interface EnhancedChatResponse {
  reply: string;
  intent: string;
  confidence: number;
  entities: EntityExtractionResult;
  nextAction: NextAction;
  suggestions?: string[];
  data?: any;
  requiresAuth?: boolean;
  permissionDenied?: boolean;
  interactionId?: number;
  sessionId?: string;
  responseCandidates?: Array<{
    response: string;
    confidence: number;
    intent: string;
  }>;
}

export interface SessionContext {
  sessionId: string;
  userId: number;
  userRole?: UserRole;
  userHub?: string;
  previousIntent?: Intent;
  previousEntities?: EntityExtractionResult;
  conversationTurn: number;
  awaitingConfirmation?: boolean;
  conversationHistory: Array<{
    message: string;
    intent: Intent;
    response: string;
    timestamp: Date;
  }>;
  startTime: Date;
}

export class EnhancedChatService {
  private sessions: Map<string, SessionContext> = new Map();
  private db: Pool;
  private classifier: any;
  private trainingData: any[] = [];

  constructor(dbPool: Pool) {
    this.db = dbPool;
    this.classifier = new natural.BayesClassifier();
    this.init();
  }

  /**
   * Initialize with database training data
   */
  private async init() {
    try {
      // Load training data from database (from unified chat system)
      const result = await this.db.query(`
        SELECT pattern, intent, response_template, examples
        FROM chat_training_data
        WHERE is_active = true
        ORDER BY priority DESC
      `);
      
      this.trainingData = result.rows;
      
      // Train classifier
      result.rows.forEach((data: any) => {
        if (data.examples && Array.isArray(data.examples)) {
          data.examples.forEach((example: string) => {
            this.classifier.addDocument(example.toLowerCase(), data.intent);
          });
        }
      });
      
      this.classifier.train();
      console.log('[UltimateChat] Initialized with', result.rows.length, 'training patterns');
    } catch (error) {
      console.error('[UltimateChat] Init error:', error);
    }
  }

  /**
   * Main message handler with self-learning and human-like responses
   */
  async handleMessage(
    userId: number,
    text: string,
    userRole?: UserRole,
    sessionId?: string,
    metadata?: any
  ): Promise<EnhancedChatResponse> {
    const startTime = Date.now();
    
    // Get or create session
    const session = sessionId 
      ? this.getOrCreateSession(sessionId, userId, userRole, metadata)
      : this.createNewSession(userId, userRole, metadata);
    
    try {
      // Step 1: Check for repeated questions
      const repeatedCheck = await interactionLogger.detectRepeatedQuestion(
        session.sessionId,
        text
      );

      if (repeatedCheck.isRepeated && repeatedCheck.repeatCount > 0) {
        return await this.handleRepeatedQuestion(
          session,
          text,
          repeatedCheck.repeatCount,
          repeatedCheck.previousResponse,
          startTime
        );
      }

      // Step 2: Sanitize and correct input
      const correctionResult = fuzzyService.getCorrectionSuggestions(text);
      const cleanedText = correctionResult.corrected;
      const sanitizedText = this.sanitizePII(cleanedText);

      // Step 3: Detect intent with multiple classifiers (Bayes + pattern matching)
      const intentResult = intentService.detectIntent(cleanedText);
      const bayesClassifications = this.classifier.getClassifications(cleanedText);
      const bayesIntent = bayesClassifications[0]?.label || intentResult.intent;
      const bayesConfidence = bayesClassifications[0]?.value || 0;
      
      // Use higher confidence result
      const finalIntent = bayesConfidence > intentResult.confidence 
        ? bayesIntent 
        : intentResult.intent;
      const finalConfidence = Math.max(bayesConfidence, intentResult.confidence);
      
      // Get top 3 intent candidates
      const intentCandidates = bayesClassifications.slice(0, 3).map((c: any) => ({
        intent: c.label,
        confidence: c.value
      }));

      // Step 4: Extract entities
      const entities = entityService.extractEntities(cleanedText);

      // Step 5: Check RBAC permissions
      if (userRole && intentResult.confidence >= 0.6) {
        const permissionCheck = await rbacService.hasPermission(
          { id: userId, role: userRole },
          intentResult.intent as Intent,
          { entities }
        );

        if (!permissionCheck.allowed) {
          return await this.handlePermissionDenied(
            session,
            text,
            sanitizedText,
            intentResult.intent,
            userRole,
            entities,
            startTime
          );
        }
      }

      // Step 6: Generate response based on confidence
      let response: EnhancedChatResponse;

      if (intentResult.confidence < 0.4) {
        // Very low confidence - ask for clarification
        response = await this.handleVeryLowConfidence(
          session,
          text,
          sanitizedText,
          intentCandidates,
          entities,
          startTime
        );
      } else if (intentResult.confidence < 0.7) {
        // Medium confidence - suggest options
        response = await this.handleMediumConfidence(
          session,
          text,
          sanitizedText,
          intentResult,
          intentCandidates,
          entities,
          startTime
        );
      } else {
        // High confidence - execute intent
        response = await this.handleHighConfidence(
          session,
          text,
          sanitizedText,
          intentResult,
          entities,
          userRole,
          startTime
        );
      }

      // Step 7: Update session context
      this.updateSessionContext(session, text, intentResult.intent as Intent, response.reply);

      return response;

    } catch (error) {
      console.error('Enhanced chat service error:', error);
      
      // Log error interaction
      const errorResponse = humanLikeResponse.addEmpathy(
        "I encountered an issue processing your request. Let me create a support ticket for you.",
        "error"
      );

      await this.logInteraction(
        session,
        text,
        text,
        errorResponse,
        [],
        0,
        'error',
        {},
        startTime,
        true, // escalated
        true  // fallback
      );

      return {
        reply: errorResponse,
        intent: 'error',
        confidence: 0,
        entities: { raw: {} },
        nextAction: 'ESCALATE',
        sessionId: session.sessionId
      };
    }
  }

  /**
   * Handle repeated question with escalating responses
   */
  private async handleRepeatedQuestion(
    session: SessionContext,
    text: string,
    repeatCount: number,
    previousResponse: string | undefined,
    startTime: number
  ): Promise<EnhancedChatResponse> {
    
    const response = humanLikeResponse.handleRepeatedQuestion(
      repeatCount,
      text,
      previousResponse
    );

    const interactionId = await this.logInteraction(
      session,
      text,
      text,
      response,
      [],
      0.5,
      'repeated_question',
      {},
      startTime,
      repeatCount >= 2, // escalate on 2nd+ repeat
      false,
      true, // flagged
      repeatCount
    );

    return {
      reply: response,
      intent: 'repeated_question',
      confidence: 0.5,
      entities: { raw: {} },
      nextAction: repeatCount >= 2 ? 'ESCALATE' : 'ASK_CLARIFICATION',
      interactionId,
      sessionId: session.sessionId,
      suggestions: repeatCount >= 2 
        ? ['Create support ticket', 'Talk to specialist', 'Try different approach']
        : ['Give more details', 'Share example', 'Rephrase question']
    };
  }

  /**
   * Handle very low confidence (< 0.4)
   */
  private async handleVeryLowConfidence(
    session: SessionContext,
    rawText: string,
    sanitizedText: string,
    candidates: any[],
    entities: any,
    startTime: number
  ): Promise<EnhancedChatResponse> {
    
    const possibleIntents = candidates.slice(0, 3).map(c => ({
      intent: c.intent,
      description: this.getIntentDescription(c.intent)
    }));

    const response = humanLikeResponse.formatLowConfidenceResponse(
      possibleIntents,
      rawText
    );

    const interactionId = await this.logInteraction(
      session,
      rawText,
      sanitizedText,
      response,
      candidates,
      candidates[0]?.confidence || 0,
      'unknown',
      entities,
      startTime,
      false,
      true, // fallback
      true  // flagged
    );

    return {
      reply: response,
      intent: 'unknown',
      confidence: candidates[0]?.confidence || 0,
      entities,
      nextAction: 'ASK_CLARIFICATION',
      interactionId,
      sessionId: session.sessionId,
      responseCandidates: candidates.slice(0, 3),
      suggestions: possibleIntents.map(p => p.description)
    };
  }

  /**
   * Handle medium confidence (0.4 - 0.7)
   */
  private async handleMediumConfidence(
    session: SessionContext,
    rawText: string,
    sanitizedText: string,
    intentResult: any,
    candidates: any[],
    entities: any,
    startTime: number
  ): Promise<EnhancedChatResponse> {
    
    const baseResponse = await this.generateIntentResponse(
      intentResult.intent,
      entities,
      session.userRole
    );

    const clarification = humanLikeResponse.addClarification(
      intentResult.intent,
      [`Yes, ${this.getIntentDescription(intentResult.intent)}`, 'No, something else']
    );

    const response = `${baseResponse}\n\n${clarification}`;

    const interactionId = await this.logInteraction(
      session,
      rawText,
      sanitizedText,
      response,
      candidates,
      intentResult.confidence,
      intentResult.intent,
      entities,
      startTime
    );

    return {
      reply: response,
      intent: intentResult.intent,
      confidence: intentResult.confidence,
      entities,
      nextAction: 'SUGGEST_OPTIONS',
      interactionId,
      sessionId: session.sessionId,
      responseCandidates: candidates.slice(0, 3)
    };
  }

  /**
   * Handle high confidence (>= 0.7)
   */
  private async handleHighConfidence(
    session: SessionContext,
    rawText: string,
    sanitizedText: string,
    intentResult: any,
    entities: any,
    userRole: UserRole | undefined,
    startTime: number
  ): Promise<EnhancedChatResponse> {
    
    const baseResponse = await this.generateIntentResponse(
      intentResult.intent,
      entities,
      userRole
    );

    // Add human-like framing
    const response = humanLikeResponse.addSupportiveFrame(baseResponse);

    const interactionId = await this.logInteraction(
      session,
      rawText,
      sanitizedText,
      response,
      [{ intent: intentResult.intent, confidence: intentResult.confidence, response }],
      intentResult.confidence,
      intentResult.intent,
      entities,
      startTime
    );

    return {
      reply: response,
      intent: intentResult.intent,
      confidence: intentResult.confidence,
      entities,
      nextAction: 'EXECUTE',
      interactionId,
      sessionId: session.sessionId
    };
  }

  /**
   * Handle permission denied
   */
  private async handlePermissionDenied(
    session: SessionContext,
    rawText: string,
    sanitizedText: string,
    intent: string,
    userRole: UserRole,
    entities: any,
    startTime: number
  ): Promise<EnhancedChatResponse> {
    
    // Get role required for action (simplified - you can enhance this)
    const action = this.getIntentDescription(intent);
    const requiredRole = 'admin'; // Default - you can make this more sophisticated
    
    const response = humanLikeResponse.formatPermissionDenied(action, requiredRole);

    const interactionId = await this.logInteraction(
      session,
      rawText,
      sanitizedText,
      response,
      [],
      0.9,
      intent,
      entities,
      startTime
    );

    return {
      reply: response,
      intent,
      confidence: 0.9,
      entities,
      nextAction: 'PERMISSION_DENIED',
      permissionDenied: true,
      interactionId,
      sessionId: session.sessionId,
      suggestions: ['Request approval', 'Contact administrator', 'Learn about permissions']
    };
  }

  /**
   * Log interaction to database
   */
  private async logInteraction(
    session: SessionContext,
    rawInput: string,
    sanitizedInput: string,
    modelResponse: string,
    candidates: any[],
    confidence: number,
    intent: string,
    entities: any,
    startTime: number,
    escalated: boolean = false,
    fallback: boolean = false,
    flagged: boolean = false,
    repeatCount: number = 0
  ): Promise<number> {
    
    const responseTime = Date.now() - startTime;

    return await interactionLogger.logInteraction({
      sessionId: session.sessionId,
      userId: session.userId,
      userRole: session.userRole,
      userHub: session.userHub,
      rawInput,
      sanitizedInput,
      modelResponse,
      responseCandidates: candidates,
      confidence,
      intentPredicted: intent,
      entitiesExtracted: entities,
      conversationTurn: session.conversationTurn,
      previousIntent: session.previousIntent,
      repeatedQuestion: repeatCount > 0,
      repeatCount,
      responseTimeMs: responseTime,
      fallbackUsed: fallback,
      escalated
    });
  }

  /**
   * Generate response for specific intent
   */
  private async generateIntentResponse(
    intent: string,
    entities: any,
    userRole?: UserRole
  ): Promise<string> {
    // This would call your existing intent handlers
    // For now, return a placeholder
    return `Processing ${intent} with entities: ${JSON.stringify(entities)}`;
  }

  /**
   * Get human-readable intent description
   */
  private getIntentDescription(intent: string): string {
    const descriptions: Record<string, string> = {
      password_reset: 'reset your password',
      create_user: 'create a new user',
      task_workflow: 'manage tasks',
      invoice_query: 'check invoices',
      greeting: 'say hello',
      // Add more...
    };
    return descriptions[intent] || intent.replace(/_/g, ' ');
  }

  /**
   * Sanitize PII from text
   */
  private sanitizePII(text: string): string {
    // Basic PII redaction - enhance as needed
    return text
      .replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[SSN]') // SSN
      .replace(/\b\d{16}\b/g, '[CARD]') // Credit card
      .replace(/\b[\w.-]+@[\w.-]+\.\w+\b/g, '[EMAIL]'); // Email
  }

  /**
   * Get or create session
   */
  private getOrCreateSession(
    sessionId: string,
    userId: number,
    userRole?: UserRole,
    metadata?: any
  ): SessionContext {
    if (this.sessions.has(sessionId)) {
      const session = this.sessions.get(sessionId)!;
      session.conversationTurn++;
      return session;
    }
    return this.createNewSession(userId, userRole, metadata, sessionId);
  }

  /**
   * Create new session
   */
  private createNewSession(
    userId: number,
    userRole?: UserRole,
    metadata?: any,
    sessionId?: string
  ): SessionContext {
    const session: SessionContext = {
      sessionId: sessionId || uuidv4(),
      userId,
      userRole,
      userHub: metadata?.hub,
      conversationTurn: 1,
      conversationHistory: [],
      startTime: new Date()
    };
    this.sessions.set(session.sessionId, session);
    return session;
  }

  /**
   * Update session context
   */
  private updateSessionContext(
    session: SessionContext,
    message: string,
    intent: Intent,
    response: string
  ): void {
    session.conversationHistory.push({
      message,
      intent,
      response,
      timestamp: new Date()
    });

    // Keep only last 10 messages
    if (session.conversationHistory.length > 10) {
      session.conversationHistory = session.conversationHistory.slice(-10);
    }

    session.previousIntent = intent;
  }

  /**
   * Clear conversation context
   */
  clearContext(userId: number, sessionId?: string): void {
    if (sessionId) {
      this.sessions.delete(sessionId);
    } else {
      // Clear all sessions for user
      for (const [sid, session] of this.sessions.entries()) {
        if (session.userId === userId) {
          this.sessions.delete(sid);
        }
      }
    }
  }

  /**
   * Get conversation history
   */
  getHistory(userId: number, sessionId: string): any[] {
    const session = this.sessions.get(sessionId);
    return session?.conversationHistory || [];
  }
}

// Note: Don't export singleton - instantiate in routes with db pool
// export const enhancedChatService = new EnhancedChatService(pool);
