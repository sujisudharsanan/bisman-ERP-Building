/**
 * Interaction Logger Service
 * Logs all chat interactions for self-learning and analysis
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface LogInteractionParams {
  sessionId: string;
  userId: number;
  userRole?: string;
  userHub?: string;
  userLocale?: string;
  
  rawInput: string;
  sanitizedInput: string;
  userIntent?: string;
  
  modelResponse: string;
  responseCandidates?: Array<{
    response: string;
    confidence: number;
    intent: string;
  }>;
  confidence: number;
  intentPredicted: string;
  entitiesExtracted?: any;
  
  conversationTurn: number;
  previousIntent?: string;
  repeatedQuestion?: boolean;
  repeatCount?: number;
  
  responseTimeMs: number;
  fallbackUsed?: boolean;
  escalated?: boolean;
  
  containsPii?: boolean;
  piiRedacted?: boolean;
}

export interface FlagInteractionParams {
  interactionId: number;
  reason: string;
  priority?: number; // 1-10
  samplingReason?: string;
}

export interface RecordFeedbackParams {
  interactionId: number;
  sessionId: string;
  userId: number;
  feedbackType: 'thumbs_up' | 'thumbs_down' | 'flag' | 'rating';
  rating?: number;
  comment?: string;
}

export class InteractionLogger {
  
  /**
   * Log a chat interaction
   */
  async logInteraction(params: LogInteractionParams): Promise<number> {
    try {
      const interaction = await prisma.$executeRawUnsafe(`
        INSERT INTO chat_interactions (
          session_id, user_id, user_role, user_hub, user_locale,
          raw_input, sanitized_input, user_intent,
          model_response, response_candidates, confidence, 
          intent_predicted, entities_extracted,
          conversation_turn, previous_intent, repeated_question, repeat_count,
          response_time_ms, fallback_used, escalated,
          contains_pii, pii_redacted, timestamp
        ) VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8,
          $9, $10, $11,
          $12, $13,
          $14, $15, $16, $17,
          $18, $19, $20,
          $21, $22, NOW()
        ) RETURNING id
      `,
        params.sessionId,
        params.userId,
        params.userRole || null,
        params.userHub || null,
        params.userLocale || 'en',
        params.rawInput,
        params.sanitizedInput,
        params.userIntent || null,
        params.modelResponse,
        params.responseCandidates ? JSON.stringify(params.responseCandidates) : null,
        params.confidence,
        params.intentPredicted,
        params.entitiesExtracted ? JSON.stringify(params.entitiesExtracted) : null,
        params.conversationTurn,
        params.previousIntent || null,
        params.repeatedQuestion || false,
        params.repeatCount || 0,
        params.responseTimeMs,
        params.fallbackUsed || false,
        params.escalated || false,
        params.containsPii || false,
        params.piiRedacted || false
      );

      // Auto-flag low confidence interactions
      if (params.confidence < 0.6) {
        await this.flagInteraction({
          interactionId: interaction,
          reason: 'Low confidence response',
          priority: 7,
          samplingReason: 'low_confidence'
        });
      }

      return interaction;
    } catch (error) {
      console.error('Error logging interaction:', error);
      throw error;
    }
  }

  /**
   * Flag an interaction for human review
   */
  async flagInteraction(params: FlagInteractionParams): Promise<void> {
    try {
      // Update interaction
      await prisma.$executeRawUnsafe(`
        UPDATE chat_interactions 
        SET flagged = TRUE, flag_reason = $1
        WHERE id = $2
      `, params.reason, params.interactionId);

      // Add to annotation queue
      await prisma.$executeRawUnsafe(`
        INSERT INTO annotation_queue (
          interaction_id, status, priority, sampling_reason, created_at
        ) VALUES ($1, 'pending', $2, $3, NOW())
        ON CONFLICT DO NOTHING
      `, params.interactionId, params.priority || 5, params.samplingReason || 'manual_flag');

    } catch (error) {
      console.error('Error flagging interaction:', error);
      throw error;
    }
  }

  /**
   * Record user feedback
   */
  async recordFeedback(params: RecordFeedbackParams): Promise<void> {
    try {
      await prisma.$executeRawUnsafe(`
        INSERT INTO chat_feedback (
          interaction_id, session_id, user_id, feedback_type, rating, comment, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
      `, 
        params.interactionId,
        params.sessionId,
        params.userId,
        params.feedbackType,
        params.rating || null,
        params.comment || null
      );

      // Update interaction with feedback
      await prisma.$executeRawUnsafe(`
        UPDATE chat_interactions 
        SET user_feedback = $1
        WHERE id = $2
      `, params.feedbackType, params.interactionId);

      // If negative feedback, flag for review
      if (params.feedbackType === 'thumbs_down' || params.feedbackType === 'flag') {
        await this.flagInteraction({
          interactionId: params.interactionId,
          reason: `User ${params.feedbackType}: ${params.comment || 'No comment'}`,
          priority: 8,
          samplingReason: 'negative_feedback'
        });
      }

    } catch (error) {
      console.error('Error recording feedback:', error);
      throw error;
    }
  }

  /**
   * Get interaction history for a session
   */
  async getSessionHistory(sessionId: string, limit: number = 10): Promise<any[]> {
    try {
      const history = await prisma.$queryRawUnsafe(`
        SELECT 
          id, raw_input, model_response, intent_predicted, 
          confidence, timestamp, conversation_turn
        FROM chat_interactions
        WHERE session_id = $1
        ORDER BY timestamp DESC
        LIMIT $2
      `, sessionId, limit);

      return history as any[];
    } catch (error) {
      console.error('Error getting session history:', error);
      return [];
    }
  }

  /**
   * Detect repeated questions in session
   */
  async detectRepeatedQuestion(
    sessionId: string,
    currentInput: string,
    threshold: number = 0.8
  ): Promise<{ isRepeated: boolean; repeatCount: number; previousResponse?: string }> {
    try {
      const recentHistory = await prisma.$queryRawUnsafe(`
        SELECT raw_input, model_response, conversation_turn
        FROM chat_interactions
        WHERE session_id = $1
        ORDER BY timestamp DESC
        LIMIT 3
      `, sessionId);

      if (!recentHistory || (recentHistory as any[]).length === 0) {
        return { isRepeated: false, repeatCount: 0 };
      }

      const history = recentHistory as any[];
      const currentLower = currentInput.toLowerCase().trim();
      
      let repeatCount = 0;
      let previousResponse: string | undefined;

      for (const entry of history) {
        const previousLower = entry.raw_input.toLowerCase().trim();
        const similarity = this.calculateSimilarity(currentLower, previousLower);
        
        if (similarity >= threshold) {
          repeatCount++;
          previousResponse = entry.model_response;
        }
      }

      return {
        isRepeated: repeatCount > 0,
        repeatCount,
        previousResponse
      };

    } catch (error) {
      console.error('Error detecting repeated question:', error);
      return { isRepeated: false, repeatCount: 0 };
    }
  }

  /**
   * Simple text similarity (Levenshtein-based approximation)
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const words1 = new Set(str1.split(/\s+/));
    const words2 = new Set(str2.split(/\s+/));
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  }

  /**
   * Get metrics for monitoring dashboard
   */
  async getMetrics(timeRange: 'hour' | 'day' | 'week' = 'day'): Promise<any> {
    try {
      const intervals = {
        hour: '1 hour',
        day: '1 day',
        week: '7 days'
      };

      const metrics = await prisma.$queryRawUnsafe(`
        SELECT 
          COUNT(*) as total_interactions,
          AVG(confidence) as avg_confidence,
          AVG(response_time_ms) as avg_response_time,
          SUM(CASE WHEN fallback_used THEN 1 ELSE 0 END)::float / COUNT(*) as fallback_rate,
          SUM(CASE WHEN escalated THEN 1 ELSE 0 END)::float / COUNT(*) as escalation_rate,
          SUM(CASE WHEN flagged THEN 1 ELSE 0 END) as flagged_count,
          SUM(CASE WHEN user_feedback = 'thumbs_up' THEN 1 ELSE 0 END) as positive_feedback,
          SUM(CASE WHEN user_feedback = 'thumbs_down' THEN 1 ELSE 0 END) as negative_feedback
        FROM chat_interactions
        WHERE timestamp >= NOW() - INTERVAL '${intervals[timeRange]}'
      `);

      return metrics[0];
    } catch (error) {
      console.error('Error getting metrics:', error);
      return null;
    }
  }

  /**
   * Get top intents
   */
  async getTopIntents(limit: number = 10): Promise<any[]> {
    try {
      const intents = await prisma.$queryRawUnsafe(`
        SELECT 
          intent_predicted,
          COUNT(*) as count,
          AVG(confidence) as avg_confidence,
          SUM(CASE WHEN flagged THEN 1 ELSE 0 END) as flagged_count
        FROM chat_interactions
        WHERE timestamp >= NOW() - INTERVAL '7 days'
          AND intent_predicted IS NOT NULL
        GROUP BY intent_predicted
        ORDER BY count DESC
        LIMIT $1
      `, limit);

      return intents as any[];
    } catch (error) {
      console.error('Error getting top intents:', error);
      return [];
    }
  }
}

export const interactionLogger = new InteractionLogger();
