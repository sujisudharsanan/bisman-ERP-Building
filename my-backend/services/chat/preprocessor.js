/**
 * Chat Preprocessor Service
 * Handles: Normalization, Language Detection, Tokenization, Spellcheck, 
 * Protected Spans, Autocorrect, Rephrase, RBAC redaction
 * 
 * Architecture follows: User → Preprocessor → Intent Classifier → Response
 */

const { Pool } = require('pg');
const fuzz = require('fuzzball');

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

class ChatPreprocessor {
  constructor() {
    this.dictionary = new Map();
    this.aliasMap = new Map();
    this.protectedPatterns = [];
    this.initialized = false;
    this.settings = {
      autocorrectThreshold: 0.98,
      suggestionThreshold: 0.70,
      rephraseEnabled: true,
      rephraseTriggerLength: 100
    };
  }

  /**
   * Initialize preprocessor - load dictionary and patterns from DB
   */
  async initialize() {
    if (this.initialized) return;

    try {
      // Load spelling dictionary
      const dictResult = await pool.query(`
        SELECT term, aliases, category, preferred_display, is_protected, case_sensitive
        FROM spelling_dictionary
      `);

      for (const row of dictResult.rows) {
        this.dictionary.set(row.term.toLowerCase(), {
          canonical: row.term,
          display: row.preferred_display || row.term,
          category: row.category,
          isProtected: row.is_protected,
          caseSensitive: row.case_sensitive
        });

        // Map aliases to canonical term
        if (row.aliases && row.aliases.length > 0) {
          for (const alias of row.aliases) {
            this.aliasMap.set(alias.toLowerCase(), row.term);
          }
        }
      }

      // Load protected span patterns
      const patternsResult = await pool.query(`
        SELECT pattern_type, pattern, priority, description
        FROM protected_spans
        WHERE is_active = true
        ORDER BY priority DESC
      `);

      this.protectedPatterns = patternsResult.rows.map(row => ({
        name: row.pattern_type,
        regex: new RegExp(row.pattern, 'gi'),
        priority: row.priority,
        description: row.description
      }));

      // Load global settings from preprocessing_settings table
      try {
        const settingsResult = await pool.query(`
          SELECT setting_key, setting_value FROM preprocessing_settings
        `);
        if (settingsResult.rows.length > 0) {
          for (const row of settingsResult.rows) {
            const value = row.setting_value;
            switch (row.setting_key) {
              case 'autocorrect_threshold':
                this.settings.autocorrectThreshold = parseFloat(value) || 0.98;
                break;
              case 'suggestion_threshold':
                this.settings.suggestionThreshold = parseFloat(value) || 0.70;
                break;
              case 'rephrase_enabled':
                this.settings.rephraseEnabled = value !== false;
                break;
              case 'rephrase_trigger_length':
                this.settings.rephraseTriggerLength = parseInt(value) || 100;
                break;
            }
          }
        }
      } catch (settingsError) {
        // Settings table may not exist or be empty - use defaults
        console.warn('[Preprocessor] Settings not loaded, using defaults');
      }

      this.initialized = true;
      console.log(`[Preprocessor] Loaded ${this.dictionary.size} terms, ${this.aliasMap.size} aliases, ${this.protectedPatterns.length} patterns`);

    } catch (error) {
      console.error('[Preprocessor] Initialization error:', error);
      this.initialized = true; // Continue without DB data
    }
  }

  /**
   * Main preprocessing pipeline
   */
  async preprocess(text, userId, role, options = {}) {
    const startTime = Date.now();
    await this.initialize();

    const result = {
      original: text,
      normalized: text,
      tokens: [],
      suggestions: [],
      protectedSpans: [],
      rephraseOptions: null,
      finalText: text,
      languageDetected: 'en',
      auditId: null
    };

    try {
      // Step 1: Normalize
      result.normalized = this.normalize(text);

      // Step 2: Detect language (simplified)
      result.languageDetected = this.detectLanguage(result.normalized);

      // Step 3: Extract and mask protected spans
      const { maskedText, spans, placeholders } = this.extractProtectedSpans(result.normalized);
      result.protectedSpans = spans;

      // Step 4: Tokenize
      result.tokens = this.tokenize(maskedText);

      // Step 5: Spellcheck and generate suggestions
      const { correctedTokens, suggestions } = await this.spellcheck(
        result.tokens,
        userId,
        maskedText,
        options
      );
      result.suggestions = suggestions;

      // Step 6: Apply autocorrections (if enabled and high confidence)
      let correctedText = correctedTokens.join(' ');

      // Step 7: Reinstate protected spans
      result.finalText = this.reinstateProtectedSpans(correctedText, placeholders);

      // Step 8: Generate rephrase options (if enabled)
      if (options.rephrase && this.settings.rephraseEnabled) {
        const needsRephrase = result.suggestions.length > 2 || 
                             text.length > this.settings.rephraseTriggerLength;
        if (needsRephrase) {
          result.rephraseOptions = await this.generateRephraseOptions(result.finalText, role);
        }
      }

      // Step 9: Audit logging
      const processingTime = Date.now() - startTime;
      result.auditId = await this.saveAudit(userId, result, options, processingTime);

    } catch (error) {
      console.error('[Preprocessor] Error:', error);
      result.finalText = text; // Fallback to original
    }

    return result;
  }

  /**
   * Step 1: Normalize text
   * - Unicode NFC normalization
   * - Trim whitespace
   * - Normalize quotes and dashes
   * - Collapse repeated whitespace
   */
  normalize(text) {
    if (!text) return '';

    let normalized = text
      // Unicode NFC normalization
      .normalize('NFC')
      // Trim
      .trim()
      // Normalize smart quotes
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/[\u201C\u201D]/g, '"')
      // Normalize dashes
      .replace(/[\u2013\u2014]/g, '-')
      // Collapse multiple spaces
      .replace(/\s+/g, ' ')
      // Remove control characters (except newline, tab)
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

    return normalized;
  }

  /**
   * Step 2: Detect language (simplified - can be enhanced with langdetect)
   */
  detectLanguage(text) {
    // Simple heuristic: check for Devanagari, Tamil, etc.
    if (/[\u0900-\u097F]/.test(text)) return 'hi'; // Hindi
    if (/[\u0B80-\u0BFF]/.test(text)) return 'ta'; // Tamil
    if (/[\u0C00-\u0C7F]/.test(text)) return 'te'; // Telugu
    return 'en'; // Default English
  }

  /**
   * Step 3: Extract protected spans (IDs, emails, dates, etc.)
   */
  extractProtectedSpans(text) {
    const spans = [];
    const placeholders = new Map();
    let maskedText = text;
    let placeholderIndex = 0;

    for (const pattern of this.protectedPatterns) {
      const matches = [...text.matchAll(pattern.regex)];
      for (const match of matches) {
        const placeholder = `<PROT_${placeholderIndex}>`;
        spans.push({
          type: pattern.name,
          value: match[0],
          start: match.index,
          end: match.index + match[0].length,
          placeholder
        });
        placeholders.set(placeholder, match[0]);
        maskedText = maskedText.replace(match[0], placeholder);
        placeholderIndex++;
      }
    }

    return { maskedText, spans, placeholders };
  }

  /**
   * Step 4: Tokenize text
   */
  tokenize(text) {
    // Split on whitespace and punctuation, keeping structure
    return text.split(/\s+/).filter(t => t.length > 0);
  }

  /**
   * Step 5: Spellcheck tokens
   */
  async spellcheck(tokens, userId, context, options) {
    const correctedTokens = [];
    const suggestions = [];

    // Load user dictionary if available
    const userDict = await this.getUserDictionary(userId);

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      const lowerToken = token.toLowerCase();

      // Skip protected placeholders
      if (token.startsWith('<PROT_')) {
        correctedTokens.push(token);
        continue;
      }

      // Skip if in user's ignore list
      if (userDict.has(lowerToken)) {
        const replacement = userDict.get(lowerToken);
        if (replacement) {
          correctedTokens.push(replacement);
        } else {
          correctedTokens.push(token);
        }
        continue;
      }

      // Check alias map first (domain terms)
      if (this.aliasMap.has(lowerToken)) {
        const canonical = this.aliasMap.get(lowerToken);
        const dictEntry = this.dictionary.get(canonical.toLowerCase());
        suggestions.push({
          pos: i,
          from: token,
          to: dictEntry?.display || canonical,
          confidence: 1.0,
          type: 'domain_term'
        });

        if (options.autocorrect) {
          correctedTokens.push(dictEntry?.display || canonical);
        } else {
          correctedTokens.push(token);
        }
        continue;
      }

      // Check dictionary exact match
      if (this.dictionary.has(lowerToken)) {
        correctedTokens.push(token);
        continue;
      }

      // Generate suggestions using fuzzy matching
      const candidates = this.generateCandidates(token);
      
      if (candidates.length > 0) {
        const best = candidates[0];
        suggestions.push({
          pos: i,
          from: token,
          to: best.term,
          confidence: best.score,
          type: 'spellcheck',
          alternatives: candidates.slice(1, 4).map(c => c.term)
        });

        // Auto-correct if high confidence and enabled
        if (options.autocorrect && best.score >= this.settings.autocorrectThreshold) {
          correctedTokens.push(best.term);
        } else {
          correctedTokens.push(token);
        }
      } else {
        correctedTokens.push(token);
      }
    }

    return { correctedTokens, suggestions };
  }

  /**
   * Generate spelling candidates using edit distance and dictionary lookup
   */
  generateCandidates(word) {
    const candidates = [];
    const lowerWord = word.toLowerCase();

    // Check aliases for fuzzy matches
    for (const [alias, canonical] of this.aliasMap.entries()) {
      const score = this.calculateSimilarity(lowerWord, alias);
      if (score >= this.settings.suggestionThreshold) {
        const dictEntry = this.dictionary.get(canonical.toLowerCase());
        candidates.push({
          term: dictEntry?.display || canonical,
          score,
          source: 'alias'
        });
      }
    }

    // Check common misspellings using edit distance
    const commonCorrections = this.getCommonCorrections(word);
    for (const correction of commonCorrections) {
      candidates.push({
        term: correction.term,
        score: correction.score,
        source: 'edit_distance'
      });
    }

    // Sort by score descending
    candidates.sort((a, b) => b.score - a.score);

    // Deduplicate
    const seen = new Set();
    return candidates.filter(c => {
      const key = c.term.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  /**
   * Calculate string similarity using fuzzball (RapidFuzz-compatible)
   * Returns score from 0 to 1
   */
  calculateSimilarity(s1, s2) {
    if (s1 === s2) return 1.0;
    if (!s1 || !s2) return 0;
    
    // Use fuzzball's ratio for accurate similarity scoring
    // Returns 0-100, we normalize to 0-1
    const score = fuzz.ratio(s1, s2) / 100;
    return score;
  }
  
  /**
   * Find best match from a list using fuzzball's extractBests
   * Returns array of {match, score} objects
   */
  findBestMatches(query, choices, options = {}) {
    const { limit = 5, cutoff = 70 } = options;
    
    // fuzzball.extract returns array of [match, score, index]
    const results = fuzz.extract(query, choices, {
      scorer: fuzz.ratio,
      limit,
      cutoff
    });
    
    return results.map(([match, score]) => ({
      match,
      score: score / 100 // Normalize to 0-1
    }));
  }

  /**
   * Get common corrections based on edit distance patterns
   */
  getCommonCorrections(word) {
    const corrections = [];
    const lowerWord = word.toLowerCase();

    // Common typo patterns
    const patterns = [
      // Doubled letters
      { pattern: /(.)\1/, replacement: '$1' },
      // Missing doubled letters
      { pattern: /([^aeiou])([aeiou])([^aeiou])/, test: true },
      // Common substitutions
      { from: 'teh', to: 'the' },
      { from: 'taht', to: 'that' },
      { from: 'recieve', to: 'receive' },
      { from: 'occured', to: 'occurred' },
      { from: 'untill', to: 'until' },
      { from: 'seperate', to: 'separate' },
      { from: 'calld', to: 'called' },
      { from: 'las', to: 'last' },
      { from: 'wnt', to: 'want' },
      { from: 'knw', to: 'know' },
      { from: 'plz', to: 'please' },
      { from: 'pls', to: 'please' },
      { from: 'msg', to: 'message' },
      { from: 'mssg', to: 'message' },
      { from: 'yr', to: 'year' },
      { from: 'yr', to: 'your' },
      { from: 'wat', to: 'what' },
      { from: 'wen', to: 'when' },
      { from: 'wer', to: 'were' },
      { from: 'hw', to: 'how' },
      { from: 'abt', to: 'about' },
      { from: 'bcz', to: 'because' },
      { from: 'bcoz', to: 'because' },
      { from: 'thx', to: 'thanks' },
      { from: 'thnx', to: 'thanks' },
      { from: 'im', to: "I'm" },
      { from: 'dont', to: "don't" },
      { from: 'cant', to: "can't" },
      { from: 'wont', to: "won't" },
      { from: 'didnt', to: "didn't" },
      { from: 'isnt', to: "isn't" },
      { from: 'wasnt', to: "wasn't" }
    ];

    // Check exact matches first
    for (const p of patterns) {
      if (p.from && lowerWord === p.from) {
        corrections.push({ term: p.to, score: 0.99 });
      }
    }

    // Check dictionary for similar words
    for (const [term, entry] of this.dictionary.entries()) {
      if (term === lowerWord) continue;
      const sim = this.calculateSimilarity(lowerWord, term);
      if (sim >= this.settings.suggestionThreshold) {
        corrections.push({ term: entry.display, score: sim });
      }
    }

    return corrections.slice(0, 5);
  }

  /**
   * Get user's personal dictionary
   */
  async getUserDictionary(userId) {
    const userDict = new Map();
    
    if (!userId) return userDict;

    try {
      const result = await pool.query(`
        SELECT term, replacement, ignore_spellcheck
        FROM personal_user_dictionary
        WHERE (owner_type = 'user' AND owner_id = $1)
           OR owner_type = 'org'
        ORDER BY owner_type DESC
      `, [userId]);

      for (const row of result.rows) {
        if (row.ignore_spellcheck) {
          userDict.set(row.term.toLowerCase(), null); // null = ignore
        } else if (row.replacement) {
          userDict.set(row.term.toLowerCase(), row.replacement);
        }
      }
    } catch (error) {
      console.error('[Preprocessor] Error loading user dictionary:', error);
    }

    return userDict;
  }

  /**
   * Step 7: Reinstate protected spans
   */
  reinstateProtectedSpans(text, placeholders) {
    let result = text;
    for (const [placeholder, original] of placeholders.entries()) {
      result = result.replace(placeholder, original);
    }
    return result;
  }

  /**
   * Step 8: Generate rephrase options
   */
  async generateRephraseOptions(text, role) {
    // Simple rule-based rephrasing (can be enhanced with LLM)
    const options = {
      formal: this.formalRephrase(text),
      concise: this.conciseRephrase(text)
    };

    return options;
  }

  /**
   * Simple formal rephrasing
   */
  formalRephrase(text) {
    let formal = text
      // Capitalize first letter
      .replace(/^./, c => c.toUpperCase())
      // Add question mark if it's a question
      .replace(/^(who|what|when|where|why|how|can|could|would|is|are|was|were|do|does|did|have|has|had)\b/i, 
               match => match.charAt(0).toUpperCase() + match.slice(1))
      // Ensure proper ending
      .replace(/\s*$/, text.match(/\?$/) ? '' : text.match(/[.!?]$/) ? '' : '?');

    return formal;
  }

  /**
   * Simple concise rephrasing
   */
  conciseRephrase(text) {
    let concise = text
      // Remove filler words
      .replace(/\b(just|actually|basically|really|very|quite|pretty much|kind of|sort of)\b/gi, '')
      // Collapse spaces
      .replace(/\s+/g, ' ')
      .trim();

    return concise;
  }

  /**
   * Step 9: Save audit log
   */
  async saveAudit(userId, result, options, processingTime) {
    try {
      const auditResult = await pool.query(`
        INSERT INTO preprocessor_audit (
          user_id, original_text, normalized_text, corrections, 
          rephrased_text, protected_spans, language_detected, processing_time_ms
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id
      `, [
        userId,
        result.original,
        result.normalized,
        JSON.stringify(result.suggestions),
        result.rephraseOptions?.formal || null,
        JSON.stringify(result.protectedSpans),
        result.languageDetected,
        processingTime
      ]);

      return auditResult.rows[0]?.id;
    } catch (error) {
      console.error('[Preprocessor] Audit save error:', error);
      return null;
    }
  }

  /**
   * Accept corrections endpoint
   */
  async acceptCorrections(userId, auditId, acceptedIndices) {
    try {
      // Get the audit record
      const audit = await pool.query(
        'SELECT * FROM preprocessor_audit WHERE id = $1 AND user_id = $2',
        [auditId, userId]
      );

      if (audit.rows.length === 0) {
        return { error: 'Audit record not found' };
      }

      const record = audit.rows[0];
      const corrections = record.corrections || [];
      
      // Apply accepted corrections
      let tokens = record.normalized_text.split(/\s+/);
      const acceptedCorrections = [];

      for (const idx of acceptedIndices) {
        if (corrections[idx]) {
          const correction = corrections[idx];
          if (tokens[correction.pos]) {
            tokens[correction.pos] = correction.to;
            acceptedCorrections.push(idx);
          }
        }
      }

      const finalText = tokens.join(' ');

      // Update audit record
      await pool.query(`
        UPDATE preprocessor_audit 
        SET accepted = true, accepted_corrections = $1, final_text = $2
        WHERE id = $3
      `, [acceptedCorrections, finalText, auditId]);

      return { finalText, acceptedCorrections };

    } catch (error) {
      console.error('[Preprocessor] Accept corrections error:', error);
      return { error: error.message };
    }
  }

  /**
   * Add term to dictionary (admin function)
   */
  async addToDictionary(term, aliases, category, createdBy) {
    try {
      await pool.query(`
        INSERT INTO spelling_dictionary (term, aliases, category, created_by)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (term) DO UPDATE SET
          aliases = EXCLUDED.aliases,
          category = EXCLUDED.category,
          updated_at = now()
      `, [term, aliases, category, createdBy]);

      // Reload dictionary
      this.initialized = false;
      await this.initialize();

      return { success: true };
    } catch (error) {
      return { error: error.message };
    }
  }

  /**
   * Add to user's personal dictionary
   */
  async addToUserDictionary(userId, term, replacement, ignoreSpellcheck = false) {
    try {
      await pool.query(`
        INSERT INTO personal_user_dictionary (owner_type, owner_id, term, replacement, ignore_spellcheck)
        VALUES ('user', $1, $2, $3, $4)
        ON CONFLICT (owner_type, owner_id, term) DO UPDATE SET
          replacement = EXCLUDED.replacement,
          ignore_spellcheck = EXCLUDED.ignore_spellcheck
      `, [userId, term.toLowerCase(), replacement, ignoreSpellcheck]);

      return { success: true };
    } catch (error) {
      return { error: error.message };
    }
  }

  /**
   * Search dictionary
   */
  async searchDictionary(query, limit = 10) {
    try {
      const result = await pool.query(`
        SELECT term, aliases, category, preferred_display
        FROM spelling_dictionary
        WHERE term ILIKE $1 OR $1 = ANY(aliases)
        LIMIT $2
      `, [`%${query}%`, limit]);

      return result.rows;
    } catch (error) {
      return [];
    }
  }
}

// Export singleton instance
const preprocessor = new ChatPreprocessor();

module.exports = {
  ChatPreprocessor,
  preprocessor,
  
  // Convenience functions
  preprocess: (text, userId, role, options) => preprocessor.preprocess(text, userId, role, options),
  acceptCorrections: (userId, auditId, indices) => preprocessor.acceptCorrections(userId, auditId, indices),
  addToDictionary: (term, aliases, cat, by) => preprocessor.addToDictionary(term, aliases, cat, by),
  addToUserDictionary: (userId, term, repl, ignore) => preprocessor.addToUserDictionary(userId, term, repl, ignore),
  searchDictionary: (query, limit) => preprocessor.searchDictionary(query, limit)
};
