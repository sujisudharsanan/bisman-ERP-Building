/**
 * Copilate Smart Chat Agent Service
 * Handles NLP, confidence checking, RBAC, and self-learning
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// =====================
// TYPES & INTERFACES
// =====================

interface Message {
  userId: string;
  text: string;
  channelId?: string;
  sessionId?: string;
}

interface NLPAnalysis {
  intent: string;
  entities: Array<{ type: string; value: string; confidence: number }>;
  confidence: number;
  unknownTerms: string[];
  keywords: string[];
}

interface BotReply {
  text: string;
  type: 'standard' | 'clarifying' | 'suggestion' | 'error' | 'permission_denied';
  confidence: number;
  requiresConfirmation: boolean;
  metadata?: Record<string, any>;
}

interface Config {
  confidenceHighThreshold: number;
  confidenceLowThreshold: number;
  autoPromoteThreshold: number;
  autoPromoteEnabled: boolean;
  learningEnabled: boolean;
  rbacEnabled: boolean;
}

// =====================
// CONFIGURATION
// =====================

let config: Config = {
  confidenceHighThreshold: 0.90,
  confidenceLowThreshold: 0.80,
  autoPromoteThreshold: 5,
  autoPromoteEnabled: false,
  learningEnabled: true,
  rbacEnabled: true,
};

export async function loadConfig(): Promise<Config> {
  try {
    const configRows = await prisma.$queryRaw<Array<{ key: string; value: any }>>`
      SELECT key, value FROM bot_config
    `;
    
    configRows.forEach(row => {
      const value = typeof row.value === 'string' ? parseFloat(row.value) : row.value;
      switch (row.key) {
        case 'confidence_threshold_high':
          config.confidenceHighThreshold = value;
          break;
        case 'confidence_threshold_low':
          config.confidenceLowThreshold = value;
          break;
        case 'auto_promote_threshold':
          config.autoPromoteThreshold = value;
          break;
        case 'auto_promote_enabled':
          config.autoPromoteEnabled = value === 'true' || value === true;
          break;
        case 'learning_enabled':
          config.learningEnabled = value === 'true' || value === true;
          break;
        case 'rbac_enabled':
          config.rbacEnabled = value === 'true' || value === true;
          break;
      }
    });
    
    return config;
  } catch (error) {
    console.error('Failed to load config, using defaults:', error);
    return config;
  }
}

// =====================
// RBAC FUNCTIONS
// =====================

export async function getUserPermissions(userId: string): Promise<string[]> {
  try {
    const result = await prisma.$queryRaw<Array<{ get_user_permissions: string[] }>>`
      SELECT get_user_permissions(${userId}::uuid) as permissions
    `;
    return result[0]?.get_user_permissions || [];
  } catch (error) {
    console.error('Failed to get user permissions:', error);
    return [];
  }
}

export async function hasPermission(userId: string, permission: string): Promise<boolean> {
  if (!config.rbacEnabled) return true;
  
  try {
    const result = await prisma.$queryRaw<Array<{ has_permission: boolean }>>`
      SELECT has_permission(${userId}::uuid, ${permission}) as has_perm
    `;
    return result[0]?.has_perm || false;
  } catch (error) {
    console.error('Permission check failed:', error);
    return false;
  }
}

// =====================
// NLP & ANALYSIS
// =====================

/**
 * Simple intent detection using keyword matching
 * In production, replace with proper NLP service (OpenAI, Hugging Face, etc.)
 */
export async function analyzeMessage(text: string): Promise<NLPAnalysis> {
  const lowerText = text.toLowerCase().trim();
  const words = lowerText.split(/\s+/);
  
  // Load knowledge base
  const knowledgeBase = await prisma.$queryRaw<Array<{
    intent: string;
    keywords: string[];
    priority: number;
  }>>`
    SELECT intent, keywords, priority
    FROM knowledge_base
    WHERE active = true
    ORDER BY priority DESC
  `;
  
  let bestMatch = {
    intent: 'unknown',
    confidence: 0,
    matchedKeywords: [] as string[]
  };
  
  // Match against knowledge base
  for (const kb of knowledgeBase) {
    const matchedKeywords = kb.keywords.filter(kw => 
      lowerText.includes(kw.toLowerCase())
    );
    
    const confidence = matchedKeywords.length / kb.keywords.length;
    
    if (confidence > bestMatch.confidence) {
      bestMatch = {
        intent: kb.intent,
        confidence,
        matchedKeywords
      };
    }
  }
  
  // Extract entities (simple pattern matching)
  const entities = extractEntities(text);
  
  // Detect unknown terms
  const unknownTerms = await detectUnknownTerms(words);
  
  // Adjust confidence based on unknown terms
  if (unknownTerms.length > 0) {
    bestMatch.confidence = Math.min(bestMatch.confidence, 0.70);
  }
  
  return {
    intent: bestMatch.intent,
    entities,
    confidence: bestMatch.confidence,
    unknownTerms,
    keywords: bestMatch.matchedKeywords
  };
}

function extractEntities(text: string): Array<{ type: string; value: string; confidence: number }> {
  const entities: Array<{ type: string; value: string; confidence: number }> = [];
  
  // Amount pattern: INR 50000, $1000, EUR 500
  const amountPattern = /(INR|USD|EUR|GBP)\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/gi;
  let match;
  while ((match = amountPattern.exec(text)) !== null) {
    entities.push({
      type: 'amount',
      value: `${match[1]} ${match[2]}`,
      confidence: 0.95
    });
  }
  
  // Date pattern: 2025-11-12, 12/11/2025
  const datePattern = /\b(\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4})\b/g;
  while ((match = datePattern.exec(text)) !== null) {
    entities.push({
      type: 'date',
      value: match[1],
      confidence: 0.90
    });
  }
  
  // Email pattern
  const emailPattern = /\b[\w.-]+@[\w.-]+\.\w+\b/g;
  while ((match = emailPattern.exec(text)) !== null) {
    entities.push({
      type: 'email',
      value: match[0],
      confidence: 0.95
    });
  }
  
  return entities;
}

async function detectUnknownTerms(words: string[]): Promise<string[]> {
  // Common stop words
  const stopWords = new Set([
    'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'must', 'can', 'to', 'of', 'in', 'for', 'on',
    'with', 'at', 'by', 'from', 'about', 'as', 'into', 'through', 'during',
    'before', 'after', 'above', 'below', 'between', 'under', 'again', 'further',
    'then', 'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all',
    'both', 'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no',
    'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 'i',
    'me', 'my', 'you', 'your', 'he', 'him', 'his', 'she', 'her', 'it', 'its',
    'we', 'us', 'our', 'they', 'them', 'their', 'what', 'which', 'who', 'whom'
  ]);
  
  // Common ERP/business terms
  const knownTerms = new Set([
    'payment', 'request', 'approval', 'task', 'pending', 'dashboard', 'show',
    'create', 'find', 'search', 'user', 'help', 'hi', 'hello', 'thanks',
    'notification', 'client', 'amount', 'status', 'invoice', 'expense',
    'report', 'manager', 'admin', 'employee', 'department', 'project'
  ]);
  
  const unknown: string[] = [];
  
  for (const word of words) {
    const cleaned = word.replace(/[^a-z0-9]/gi, '').toLowerCase();
    if (cleaned.length < 3) continue; // Skip very short words
    if (stopWords.has(cleaned)) continue;
    if (knownTerms.has(cleaned)) continue;
    if (/^\d+$/.test(cleaned)) continue; // Skip pure numbers
    
    unknown.push(cleaned);
  }
  
  return [...new Set(unknown)]; // Remove duplicates
}

// =====================
// MESSAGE PROCESSING
// =====================

export async function processMessage(message: Message): Promise<BotReply> {
  const { userId, text, channelId, sessionId } = message;
  
  // RBAC check - basic send message permission
  if (config.rbacEnabled) {
    const canSend = await hasPermission(userId, 'send_message');
    if (!canSend) {
      await logAudit(userId, 'permission_denied', {
        action: 'send_message',
        text
      });
      
      return {
        text: "I don't have permission to assist you. Please contact an administrator.",
        type: 'permission_denied',
        confidence: 1.0,
        requiresConfirmation: false
      };
    }
  }
  
  // Analyze message
  const analysis = await analyzeMessage(text);
  
  // Save message to database
  const messageId = await saveMessage(userId, text, analysis, channelId, sessionId);
  
  // Handle unknown terms
  if (config.learningEnabled && analysis.unknownTerms.length > 0) {
    await handleUnknownTerms(analysis.unknownTerms, messageId);
  }
  
  // Generate reply based on confidence
  let reply: BotReply;
  
  if (analysis.confidence < config.confidenceLowThreshold) {
    // Low confidence - ask clarifying question
    reply = await generateClarifyingQuestion(analysis, messageId);
  } else if (analysis.confidence < config.confidenceHighThreshold) {
    // Medium confidence - suggest and ask for confirmation
    reply = await generateSuggestionWithConfirmation(analysis, userId);
  } else {
    // High confidence - proceed with reply
    reply = await generateConfidentReply(analysis, userId);
  }
  
  // Save reply
  await saveReply(messageId, reply);
  
  // Log to audit
  await logAudit(userId, 'bot_reply', {
    intent: analysis.intent,
    confidence: analysis.confidence,
    replyType: reply.type
  });
  
  return reply;
}

async function saveMessage(
  userId: string,
  text: string,
  analysis: NLPAnalysis,
  channelId?: string,
  sessionId?: string
): Promise<string> {
  const result = await prisma.$queryRaw<Array<{ id: string }>>`
    INSERT INTO chat_messages (user_id, raw_text, parsed_json, intent, entities, confidence, channel_id, session_id)
    VALUES (
      ${userId}::uuid,
      ${text},
      ${JSON.stringify(analysis)}::jsonb,
      ${analysis.intent},
      ${JSON.stringify(analysis.entities)}::jsonb,
      ${analysis.confidence},
      ${channelId || null},
      ${sessionId || null}::uuid
    )
    RETURNING id::text
  `;
  
  return result[0].id;
}

async function saveReply(messageId: string, reply: BotReply): Promise<void> {
  await prisma.$queryRaw`
    INSERT INTO bot_replies (message_id, bot_text, reply_type, confidence, metadata)
    VALUES (
      ${messageId}::uuid,
      ${reply.text},
      ${reply.type},
      ${reply.confidence},
      ${JSON.stringify(reply.metadata || {})}::jsonb
    )
  `;
}

async function handleUnknownTerms(terms: string[], messageId: string): Promise<void> {
  for (const term of terms) {
    await prisma.$queryRaw`
      SELECT increment_unknown_term_occurrence(${term}, ${messageId}::uuid)
    `;
    
    await prisma.$queryRaw`
      INSERT INTO learning_events (event_type, user_id, details)
      VALUES ('unknown_term', NULL, ${JSON.stringify({ term, messageId })}::jsonb)
    `;
  }
}

// =====================
// REPLY GENERATION
// =====================

async function generateClarifyingQuestion(analysis: NLPAnalysis, messageId: string): Promise<BotReply> {
  if (analysis.unknownTerms.length > 0) {
    const term = analysis.unknownTerms[0];
    
    return {
      text: `I'm not sure what you mean by "${term}". Could you explain in one sentence, or would you like me to try something else?`,
      type: 'clarifying',
      confidence: analysis.confidence,
      requiresConfirmation: false,
      metadata: {
        unknownTerm: term,
        messageId
      }
    };
  }
  
  if (analysis.intent === 'unknown') {
    return {
      text: "I'm not sure I understood that correctly. Could you rephrase or provide more details?",
      type: 'clarifying',
      confidence: analysis.confidence,
      requiresConfirmation: false
    };
  }
  
  return {
    text: `I think you want to ${analysis.intent.replace(/_/g, ' ')}, but I'm not completely sure. Is that correct?`,
    type: 'clarifying',
    confidence: analysis.confidence,
    requiresConfirmation: true
  };
}

async function generateSuggestionWithConfirmation(analysis: NLPAnalysis, userId: string): Promise<BotReply> {
  const kb = await getKnowledgeBase(analysis.intent);
  
  if (!kb) {
    return generateClarifyingQuestion(analysis, '');
  }
  
  // Check RBAC if required
  if (kb.requires_rbac) {
    const hasPerms = await checkPermissions(userId, kb.required_permissions);
    if (!hasPerms) {
      return {
        text: "I don't have permission to perform that action for you. Please contact an administrator.",
        type: 'permission_denied',
        confidence: 1.0,
        requiresConfirmation: false
      };
    }
  }
  
  const reply = await renderTemplate(kb.reply_template, analysis);
  
  return {
    text: `${reply}\n\nDoes this sound right? (yes/no)`,
    type: 'suggestion',
    confidence: analysis.confidence,
    requiresConfirmation: true,
    metadata: {
      intent: analysis.intent,
      knowledgeBaseId: kb.id
    }
  };
}

async function generateConfidentReply(analysis: NLPAnalysis, userId: string): Promise<BotReply> {
  const kb = await getKnowledgeBase(analysis.intent);
  
  if (!kb) {
    return {
      text: "I understand what you're asking, but I don't have that capability yet. Would you like me to learn how to help with this?",
      type: 'suggestion',
      confidence: analysis.confidence,
      requiresConfirmation: true
    };
  }
  
  // Check RBAC
  if (kb.requires_rbac) {
    const hasPerms = await checkPermissions(userId, kb.required_permissions);
    if (!hasPerms) {
      return {
        text: "I don't have permission to perform that action for you. Please contact an administrator.",
        type: 'permission_denied',
        confidence: 1.0,
        requiresConfirmation: false
      };
    }
  }
  
  const reply = await renderTemplate(kb.reply_template, analysis);
  
  // Update usage
  await prisma.$queryRaw`
    SELECT update_knowledge_usage(${kb.id}::uuid)
  `;
  
  return {
    text: reply,
    type: 'standard',
    confidence: analysis.confidence,
    requiresConfirmation: kb.requires_confirmation,
    metadata: {
      intent: analysis.intent,
      knowledgeBaseId: kb.id
    }
  };
}

async function getKnowledgeBase(intent: string): Promise<any> {
  const result = await prisma.$queryRaw<Array<any>>`
    SELECT * FROM knowledge_base
    WHERE intent = ${intent} AND active = true
    LIMIT 1
  `;
  
  return result[0] || null;
}

async function checkPermissions(userId: string, requiredPermissions: string[]): Promise<boolean> {
  if (!requiredPermissions || requiredPermissions.length === 0) return true;
  
  const userPerms = await getUserPermissions(userId);
  
  if (userPerms.includes('all')) return true;
  
  return requiredPermissions.every(perm => userPerms.includes(perm));
}

async function renderTemplate(template: string, analysis: NLPAnalysis): Promise<string> {
  let rendered = template;
  
  // Replace {{count}} with entity values
  const countEntity = analysis.entities.find(e => e.type === 'count' || e.type === 'number');
  if (countEntity) {
    const count = parseInt(countEntity.value);
    rendered = rendered.replace(/{{count}}/g, count.toString());
    rendered = rendered.replace(/{{plural}}/g, count !== 1 ? 's' : '');
  }
  
  // Replace {{query}} with extracted text
  const queryEntity = analysis.entities.find(e => e.type === 'query');
  if (queryEntity) {
    rendered = rendered.replace(/{{query}}/g, queryEntity.value);
  }
  
  return rendered;
}

// =====================
// LEARNING FUNCTIONS
// =====================

export async function createCandidateResponse(
  termId: number,
  suggestedText: string,
  suggestedBy: string,
  context?: string
): Promise<string> {
  const result = await prisma.$queryRaw<Array<{ id: string }>>`
    INSERT INTO candidate_responses (term_id, suggested_text, suggested_by, context)
    VALUES (${termId}, ${suggestedText}, ${suggestedBy}::uuid, ${context || null})
    RETURNING id::text
  `;
  
  await prisma.$queryRaw`
    INSERT INTO learning_events (event_type, term_id, user_id, details)
    VALUES ('candidate_created', ${termId}, ${suggestedBy}::uuid, ${JSON.stringify({ suggestedText })}::jsonb)
  `;
  
  return result[0].id;
}

export async function voteOnCandidate(
  candidateId: string,
  userId: string,
  voteType: 'up' | 'down' | 'neutral',
  comment?: string
): Promise<void> {
  await prisma.$queryRaw`
    INSERT INTO candidate_feedback (candidate_id, user_id, vote_type, comment)
    VALUES (${candidateId}::uuid, ${userId}::uuid, ${voteType}, ${comment || null})
    ON CONFLICT (candidate_id, user_id)
    DO UPDATE SET vote_type = ${voteType}, comment = ${comment || null}
  `;
  
  // Update vote count
  const voteCount = await prisma.$queryRaw<Array<{ count: number }>>`
    SELECT COUNT(*)::int as count
    FROM candidate_feedback
    WHERE candidate_id = ${candidateId}::uuid AND vote_type = 'up'
  `;
  
  await prisma.$queryRaw`
    UPDATE candidate_responses
    SET votes = ${voteCount[0].count}
    WHERE id = ${candidateId}::uuid
  `;
  
  // Check for auto-promotion
  if (config.autoPromoteEnabled && voteCount[0].count >= config.autoPromoteThreshold) {
    await autoPromoteCandidate(candidateId);
  }
}

async function autoPromoteCandidate(candidateId: string): Promise<void> {
  // Get candidate details
  const candidate = await prisma.$queryRaw<Array<any>>`
    SELECT c.*, u.term
    FROM candidate_responses c
    JOIN unknown_terms u ON c.term_id = u.id
    WHERE c.id = ${candidateId}::uuid
  `;
  
  if (!candidate[0]) return;
  
  const { suggested_text, term } = candidate[0];
  
  // Add to knowledge base
  await prisma.$queryRaw`
    INSERT INTO knowledge_base (intent, keywords, reply_template, category, created_by)
    VALUES (
      ${`learned_${term}`},
      ARRAY[${term}]::text[],
      ${suggested_text},
      'learned',
      NULL
    )
  `;
  
  // Mark as approved and auto-promoted
  await prisma.$queryRaw`
    UPDATE candidate_responses
    SET approved = true, auto_promoted = true, approval_date = now()
    WHERE id = ${candidateId}::uuid
  `;
  
  // Log learning event
  await prisma.$queryRaw`
    INSERT INTO learning_events (event_type, candidate_id, details)
    VALUES ('auto_promoted', ${candidateId}::uuid, ${JSON.stringify({ term, votes: candidate[0].votes })}::jsonb)
  `;
}

// =====================
// AUDIT LOGGING
// =====================

async function logAudit(
  userId: string,
  action: string,
  meta: Record<string, any>
): Promise<void> {
  await prisma.$queryRaw`
    INSERT INTO audit_logs (user_id, action, meta)
    VALUES (${userId}::uuid, ${action}, ${JSON.stringify(meta)}::jsonb)
  `;
}

// =====================
// EXPORTS
// =====================

export const CopilateSmartAgent = {
  processMessage,
  analyzeMessage,
  getUserPermissions,
  hasPermission,
  createCandidateResponse,
  voteOnCandidate,
  loadConfig,
};

export default CopilateSmartAgent;
