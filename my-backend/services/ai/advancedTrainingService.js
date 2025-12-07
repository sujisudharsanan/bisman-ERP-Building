/**
 * =====================================================
 * ADVANCED CHAT TRAINING SERVICE
 * =====================================================
 * Features:
 * - Self-learning from user feedback
 * - Multi-turn conversation context management
 * - Entity extraction and slot filling
 * - A/B testing for response optimization
 * - Semantic similarity matching
 * - Learning queue for admin review
 * - Analytics and performance tracking
 * =====================================================
 */

const { Pool } = require('pg');
const natural = require('natural');
const crypto = require('crypto');
require('dotenv').config();

// Database connection
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

class AdvancedTrainingService {
  constructor() {
    this.tokenizer = new natural.WordTokenizer();
    this.stemmer = natural.PorterStemmer;
    this.TfIdf = natural.TfIdf;
    this.tfidf = new this.TfIdf();
    this.classifier = new natural.BayesClassifier();
    
    // Cache for performance
    this.intentCache = new Map();
    this.entityCache = new Map();
    this.contextCache = new Map();
    
    // Configuration
    this.config = {
      minConfidenceThreshold: 0.6,
      learningQueueThreshold: 0.4,
      cacheMaxAge: 3600000, // 1 hour
      maxContextTurns: 10,
      similarityThreshold: 0.7
    };
    
    this.initialized = false;
  }

  /**
   * Initialize the training service
   */
  async init() {
    if (this.initialized) return;
    
    try {
      console.log('[AdvancedTraining] 🚀 Initializing...');
      
      // Load training data into TF-IDF
      await this.loadTrainingData();
      
      // Load entity definitions
      await this.loadEntityTypes();
      
      // Load intent flows
      await this.loadIntentFlows();
      
      this.initialized = true;
      console.log('[AdvancedTraining] ✅ Initialized successfully');
    } catch (error) {
      console.error('[AdvancedTraining] ❌ Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Load training data and build TF-IDF model
   */
  async loadTrainingData() {
    try {
      const result = await pool.query(`
        SELECT id, pattern, intent, response_template, category, 
               keywords, synonyms, examples, priority, success_rate
        FROM chat_training_data
        WHERE is_active = true
        ORDER BY priority DESC, success_rate DESC
      `);
      
      this.trainingData = result.rows;
      
      // Build TF-IDF model
      this.tfidf = new this.TfIdf();
      result.rows.forEach((data, index) => {
        const patterns = data.pattern.split('|').join(' ');
        const examples = Array.isArray(data.examples) ? data.examples.join(' ') : '';
        const keywords = Array.isArray(data.keywords) ? data.keywords.join(' ') : '';
        
        this.tfidf.addDocument(`${patterns} ${examples} ${keywords}`.toLowerCase());
        this.classifier.addDocument(`${patterns} ${examples}`.toLowerCase(), data.intent);
      });
      
      this.classifier.train();
      
      console.log(`[AdvancedTraining] 📚 Loaded ${result.rows.length} training patterns`);
    } catch (error) {
      console.error('[AdvancedTraining] Error loading training data:', error);
      this.trainingData = [];
    }
  }

  /**
   * Load custom entity types
   */
  async loadEntityTypes() {
    try {
      const result = await pool.query(`
        SELECT entity_name, entity_type, patterns, values, synonyms
        FROM chat_entity_types
        WHERE is_active = true
      `);
      
      this.entityTypes = new Map();
      result.rows.forEach(entity => {
        this.entityTypes.set(entity.entity_name, entity);
      });
      
      console.log(`[AdvancedTraining] 📋 Loaded ${result.rows.length} entity types`);
    } catch (error) {
      console.error('[AdvancedTraining] Error loading entity types:', error);
      this.entityTypes = new Map();
    }
  }

  /**
   * Load intent flow definitions
   */
  async loadIntentFlows() {
    try {
      const result = await pool.query(`
        SELECT from_intent, to_intent, trigger_condition, probability, context_update
        FROM chat_intent_flows
        WHERE is_active = true
      `);
      
      this.intentFlows = new Map();
      result.rows.forEach(flow => {
        if (!this.intentFlows.has(flow.from_intent)) {
          this.intentFlows.set(flow.from_intent, []);
        }
        this.intentFlows.get(flow.from_intent).push(flow);
      });
      
      console.log(`[AdvancedTraining] 🔄 Loaded ${result.rows.length} intent flows`);
    } catch (error) {
      console.error('[AdvancedTraining] Error loading intent flows:', error);
      this.intentFlows = new Map();
    }
  }

  /**
   * Advanced intent classification with TF-IDF similarity
   */
  async classifyWithSimilarity(message, userId = null) {
    const lowerMessage = message.toLowerCase();
    const queryHash = crypto.createHash('md5').update(lowerMessage).digest('hex');
    
    // Check semantic cache first
    const cachedResult = await this.checkSemanticCache(queryHash);
    if (cachedResult) {
      return cachedResult;
    }
    
    // Get TF-IDF similarity scores
    const similarities = [];
    this.tfidf.tfidfs(lowerMessage, (i, measure) => {
      if (measure > 0 && this.trainingData[i]) {
        similarities.push({
          index: i,
          score: measure,
          intent: this.trainingData[i].intent,
          data: this.trainingData[i]
        });
      }
    });
    
    // Sort by similarity score
    similarities.sort((a, b) => b.score - a.score);
    
    // Get Bayes classification
    const bayesResult = this.classifier.getClassifications(lowerMessage);
    const topBayes = bayesResult[0];
    
    // Combine TF-IDF and Bayes scores
    let bestMatch = null;
    let confidence = 0;
    let method = 'combined';
    
    if (similarities.length > 0 && topBayes) {
      const tfidfIntent = similarities[0].intent;
      const tfidfScore = Math.min(similarities[0].score / 10, 1); // Normalize
      
      if (tfidfIntent === topBayes.label) {
        // Both agree - high confidence
        confidence = (tfidfScore + topBayes.value) / 2;
        bestMatch = similarities[0].data;
        method = 'combined_agree';
      } else if (tfidfScore > topBayes.value) {
        // TF-IDF wins
        confidence = tfidfScore;
        bestMatch = similarities[0].data;
        method = 'tfidf';
      } else {
        // Bayes wins
        confidence = topBayes.value;
        bestMatch = this.trainingData.find(d => d.intent === topBayes.label);
        method = 'bayes';
      }
    } else if (similarities.length > 0) {
      confidence = Math.min(similarities[0].score / 10, 1);
      bestMatch = similarities[0].data;
      method = 'tfidf_only';
    } else if (topBayes) {
      confidence = topBayes.value;
      bestMatch = this.trainingData.find(d => d.intent === topBayes.label);
      method = 'bayes_only';
    }
    
    // If low confidence, add to learning queue
    if (confidence < this.config.learningQueueThreshold) {
      await this.addToLearningQueue(message, bestMatch?.intent, confidence, 'low_confidence');
    }
    
    // Cache the result
    if (bestMatch && confidence > this.config.minConfidenceThreshold) {
      await this.cacheSemanticResult(queryHash, lowerMessage, bestMatch.intent, bestMatch.id, confidence);
    }
    
    return {
      intent: bestMatch?.intent || 'unknown',
      confidence,
      method,
      trainingId: bestMatch?.id,
      responseTemplate: bestMatch?.response_template,
      category: bestMatch?.category,
      alternatives: similarities.slice(1, 4).map(s => ({
        intent: s.intent,
        score: Math.min(s.score / 10, 1)
      }))
    };
  }

  /**
   * Check semantic cache for query
   */
  async checkSemanticCache(queryHash) {
    try {
      const result = await pool.query(`
        SELECT matched_intent, matched_training_id, similarity_score
        FROM chat_semantic_cache
        WHERE query_hash = $1
        AND last_hit_at > NOW() - INTERVAL '1 hour'
      `, [queryHash]);
      
      if (result.rows.length > 0) {
        // Update hit count
        await pool.query(`
          UPDATE chat_semantic_cache
          SET hit_count = hit_count + 1, last_hit_at = NOW()
          WHERE query_hash = $1
        `, [queryHash]);
        
        const cached = result.rows[0];
        const training = this.trainingData.find(d => d.id === cached.matched_training_id);
        
        return {
          intent: cached.matched_intent,
          confidence: parseFloat(cached.similarity_score),
          method: 'cached',
          trainingId: cached.matched_training_id,
          responseTemplate: training?.response_template,
          category: training?.category
        };
      }
      return null;
    } catch (error) {
      console.error('[AdvancedTraining] Cache check error:', error);
      return null;
    }
  }

  /**
   * Cache semantic result
   */
  async cacheSemanticResult(queryHash, queryText, intent, trainingId, score) {
    try {
      await pool.query(`
        INSERT INTO chat_semantic_cache (query_hash, query_text, matched_intent, matched_training_id, similarity_score)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (query_hash) 
        DO UPDATE SET hit_count = chat_semantic_cache.hit_count + 1, last_hit_at = NOW()
      `, [queryHash, queryText, intent, trainingId, score]);
    } catch (error) {
      console.error('[AdvancedTraining] Cache save error:', error);
    }
  }

  /**
   * Add unmatched/low-confidence query to learning queue
   */
  async addToLearningQueue(message, detectedIntent, confidence, source = 'unmatched') {
    try {
      // Check for similar existing entries
      const existing = await pool.query(`
        SELECT id, frequency, similar_messages
        FROM chat_learning_queue
        WHERE status = 'pending'
        AND SIMILARITY(user_message, $1) > $2
        LIMIT 1
      `, [message, this.config.similarityThreshold]);
      
      if (existing.rows.length > 0) {
        // Update existing entry
        const entry = existing.rows[0];
        const similarMessages = entry.similar_messages || [];
        similarMessages.push(message);
        
        await pool.query(`
          UPDATE chat_learning_queue
          SET frequency = frequency + 1,
              similar_messages = $1,
              updated_at = NOW()
          WHERE id = $2
        `, [JSON.stringify(similarMessages), entry.id]);
        
        return entry.id;
      } else {
        // Create new entry
        const result = await pool.query(`
          INSERT INTO chat_learning_queue (source, user_message, detected_intent, confidence, suggested_intent)
          VALUES ($1, $2, $3, $4, $5)
          RETURNING id
        `, [source, message, detectedIntent, confidence, detectedIntent]);
        
        return result.rows[0].id;
      }
    } catch (error) {
      console.error('[AdvancedTraining] Learning queue error:', error);
      return null;
    }
  }

  /**
   * Extract entities from message
   */
  extractEntities(message) {
    const entities = {};
    const lowerMessage = message.toLowerCase();
    
    // Built-in entity extraction
    
    // Dates
    const datePatterns = [
      /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/g,
      /(today|tomorrow|yesterday)/gi,
      /(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/gi,
      /(next|last|this)\s+(week|month|year)/gi
    ];
    
    entities.dates = [];
    datePatterns.forEach(pattern => {
      const matches = message.match(pattern);
      if (matches) entities.dates.push(...matches);
    });
    
    // Numbers
    const numberMatches = message.match(/\b\d+(\.\d+)?\b/g);
    entities.numbers = numberMatches || [];
    
    // Email
    const emailMatches = message.match(/[\w.-]+@[\w.-]+\.\w+/g);
    entities.emails = emailMatches || [];
    
    // Phone
    const phoneMatches = message.match(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g);
    entities.phones = phoneMatches || [];
    
    // Custom entity types from database
    this.entityTypes.forEach((entityDef, entityName) => {
      if (entityDef.patterns && Array.isArray(entityDef.patterns)) {
        entityDef.patterns.forEach(pattern => {
          try {
            const regex = new RegExp(pattern, 'gi');
            const matches = message.match(regex);
            if (matches) {
              entities[entityName] = matches;
            }
          } catch (e) {
            // Invalid regex, skip
          }
        });
      }
      
      // List-based entities
      if (entityDef.values && typeof entityDef.values === 'object') {
        const values = Object.keys(entityDef.values);
        values.forEach(value => {
          if (lowerMessage.includes(value.toLowerCase())) {
            if (!entities[entityName]) entities[entityName] = [];
            entities[entityName].push(value);
          }
        });
      }
    });
    
    return entities;
  }

  /**
   * Manage conversation context
   */
  async getConversationContext(conversationId, userId) {
    try {
      const result = await pool.query(`
        SELECT turn_number, user_message, bot_response, intent, entities, context_state
        FROM chat_conversation_context
        WHERE conversation_id = $1
        ORDER BY turn_number DESC
        LIMIT $2
      `, [conversationId, this.config.maxContextTurns]);
      
      return {
        turns: result.rows.reverse(),
        lastIntent: result.rows[0]?.intent,
        lastContext: result.rows[0]?.context_state || {},
        turnCount: result.rows.length
      };
    } catch (error) {
      console.error('[AdvancedTraining] Context fetch error:', error);
      return { turns: [], lastIntent: null, lastContext: {}, turnCount: 0 };
    }
  }

  /**
   * Save conversation turn
   */
  async saveConversationTurn(conversationId, userId, userMessage, botResponse, intent, confidence, entities, contextState) {
    try {
      // Get next turn number
      const turnResult = await pool.query(`
        SELECT COALESCE(MAX(turn_number), 0) + 1 as next_turn
        FROM chat_conversation_context
        WHERE conversation_id = $1
      `, [conversationId]);
      
      const turnNumber = turnResult.rows[0].next_turn;
      
      await pool.query(`
        INSERT INTO chat_conversation_context 
        (conversation_id, user_id, turn_number, user_message, bot_response, intent, confidence, entities, context_state)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [conversationId, userId, turnNumber, userMessage, botResponse, intent, confidence, 
          JSON.stringify(entities), JSON.stringify(contextState)]);
      
      return turnNumber;
    } catch (error) {
      console.error('[AdvancedTraining] Save turn error:', error);
      return null;
    }
  }

  /**
   * Record user feedback
   */
  async recordFeedback(conversationId, messageId, userId, trainingId, feedbackType, feedbackValue, correction = null) {
    try {
      await pool.query(`
        INSERT INTO chat_feedback 
        (conversation_id, message_id, user_id, training_data_id, feedback_type, feedback_value, user_correction)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [conversationId, messageId, userId, trainingId, feedbackType, feedbackValue, correction]);
      
      // Update training data stats
      if (trainingId) {
        const field = feedbackType === 'positive' ? 'positive_feedback' : 'negative_feedback';
        await pool.query(`
          UPDATE chat_training_data
          SET ${field} = ${field} + 1,
              total_matches = total_matches + 1,
              last_matched_at = NOW()
          WHERE id = $1
        `, [trainingId]);
      }
      
      // If correction provided, add to learning queue
      if (correction) {
        await this.addToLearningQueue(correction, null, 0, 'user_correction');
      }
      
      return true;
    } catch (error) {
      console.error('[AdvancedTraining] Feedback error:', error);
      return false;
    }
  }

  /**
   * Get response variant for A/B testing
   */
  async getResponseVariant(trainingId) {
    try {
      const result = await pool.query(`
        SELECT id, response_template, weight
        FROM chat_response_variants
        WHERE training_data_id = $1 AND is_active = true
        ORDER BY 
          (positive_reactions + 1.0) / (impressions + 2.0) * random() DESC
        LIMIT 1
      `, [trainingId]);
      
      if (result.rows.length > 0) {
        // Track impression
        await pool.query(`
          UPDATE chat_response_variants
          SET impressions = impressions + 1
          WHERE id = $1
        `, [result.rows[0].id]);
        
        return {
          variantId: result.rows[0].id,
          response: result.rows[0].response_template
        };
      }
      
      return null;
    } catch (error) {
      console.error('[AdvancedTraining] Variant error:', error);
      return null;
    }
  }

  /**
   * Get next intents based on flow
   */
  getNextIntents(currentIntent) {
    const flows = this.intentFlows.get(currentIntent) || [];
    return flows.map(f => ({
      intent: f.to_intent,
      probability: f.probability,
      condition: f.trigger_condition
    }));
  }

  /**
   * Get slots required for intent
   */
  async getSlotsForIntent(intent) {
    try {
      const result = await pool.query(`
        SELECT slot_name, slot_type, entity_type, is_required, prompt_message, default_value
        FROM chat_context_slots
        WHERE intent = $1 AND is_active = true
        ORDER BY order_priority
      `, [intent]);
      
      return result.rows;
    } catch (error) {
      console.error('[AdvancedTraining] Slots error:', error);
      return [];
    }
  }

  /**
   * Check which slots are filled
   */
  checkSlotsFilled(slots, entities, context) {
    const filledSlots = {};
    const missingSlots = [];
    
    slots.forEach(slot => {
      let value = null;
      
      // Check entities first
      if (slot.entity_type && entities[slot.entity_type]) {
        value = entities[slot.entity_type][0];
      }
      
      // Check context
      if (!value && context[slot.slot_name]) {
        value = context[slot.slot_name];
      }
      
      // Use default if available
      if (!value && slot.default_value) {
        value = slot.default_value;
      }
      
      if (value) {
        filledSlots[slot.slot_name] = value;
      } else if (slot.is_required) {
        missingSlots.push(slot);
      }
    });
    
    return { filledSlots, missingSlots };
  }

  /**
   * Get learning queue for admin review
   */
  async getLearningQueue(status = 'pending', limit = 50) {
    try {
      const result = await pool.query(`
        SELECT id, source, user_message, detected_intent, confidence, 
               suggested_intent, suggested_response, frequency, 
               similar_messages, status, created_at
        FROM chat_learning_queue
        WHERE status = $1
        ORDER BY frequency DESC, created_at DESC
        LIMIT $2
      `, [status, limit]);
      
      return result.rows;
    } catch (error) {
      console.error('[AdvancedTraining] Queue fetch error:', error);
      return [];
    }
  }

  /**
   * Approve learning queue item and create training
   */
  async approveLearningItem(itemId, intent, responseTemplate, category, reviewerId) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Get the item
      const itemResult = await client.query(`
        SELECT user_message, similar_messages FROM chat_learning_queue WHERE id = $1
      `, [itemId]);
      
      if (itemResult.rows.length === 0) {
        throw new Error('Learning item not found');
      }
      
      const item = itemResult.rows[0];
      const examples = [item.user_message, ...(item.similar_messages || [])];
      
      // Create new training data
      await client.query(`
        INSERT INTO chat_training_data (pattern, intent, response_template, category, examples, priority)
        VALUES ($1, $2, $3, $4, $5, 5)
      `, [item.user_message, intent, responseTemplate, category, examples]);
      
      // Update queue item
      await client.query(`
        UPDATE chat_learning_queue
        SET status = 'approved', reviewed_by = $1, reviewed_at = NOW(), 
            suggested_intent = $2, suggested_response = $3
        WHERE id = $4
      `, [reviewerId, intent, responseTemplate, itemId]);
      
      await client.query('COMMIT');
      
      // Reload training data
      await this.loadTrainingData();
      
      return true;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('[AdvancedTraining] Approve error:', error);
      return false;
    } finally {
      client.release();
    }
  }

  /**
   * Get training analytics
   */
  async getAnalytics(days = 7) {
    try {
      const result = await pool.query(`
        SELECT date, total_messages, matched_intents, unmatched_intents,
               avg_confidence, feedback_positive, feedback_negative
        FROM chat_training_analytics
        WHERE date >= CURRENT_DATE - $1
        ORDER BY date DESC
      `, [days]);
      
      // Get top intents
      const intents = await pool.query(`
        SELECT intent, total_matches, positive_feedback, negative_feedback, success_rate
        FROM chat_training_data
        WHERE is_active = true
        ORDER BY total_matches DESC
        LIMIT 10
      `);
      
      // Get unmatched count
      const unmatched = await pool.query(`
        SELECT COUNT(*) as count FROM chat_learning_queue WHERE status = 'pending'
      `);
      
      return {
        dailyStats: result.rows,
        topIntents: intents.rows,
        pendingLearning: parseInt(unmatched.rows[0].count)
      };
    } catch (error) {
      console.error('[AdvancedTraining] Analytics error:', error);
      return { dailyStats: [], topIntents: [], pendingLearning: 0 };
    }
  }

  /**
   * Aggregate daily analytics
   */
  async aggregateDailyAnalytics() {
    try {
      await pool.query(`SELECT aggregate_chat_analytics()`);
      console.log('[AdvancedTraining] ✅ Daily analytics aggregated');
    } catch (error) {
      console.error('[AdvancedTraining] Aggregation error:', error);
    }
  }

  /**
   * Retrain classifier with updated data
   */
  async retrain() {
    console.log('[AdvancedTraining] 🔄 Retraining classifier...');
    await this.loadTrainingData();
    console.log('[AdvancedTraining] ✅ Retraining complete');
  }
}

// Singleton instance
const advancedTrainingService = new AdvancedTrainingService();

module.exports = advancedTrainingService;
