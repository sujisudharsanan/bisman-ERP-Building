/**
 * AI Backend Integration Wrapper
 * Connects Copilate Smart Agent with existing Ollama AI server
 */

import fetch from 'node-fetch';

// Configuration
const AI_SERVER_URL = process.env.AI_SERVER_URL || 'http://localhost:8000';
const AI_TIMEOUT = 10000; // 10 seconds

interface AIEnhancedNLP {
  intent: string;
  entities: Array<{ type: string; value: string; confidence: number }>;
  confidence: number;
  reasoning?: string;
  suggestedReply?: string;
  spellCorrections?: Array<{ original: string; corrected: string }>;
  unknownTerms?: string[];
}

interface AIGeneratedReply {
  text: string;
  confidence: number;
  natural: boolean;
}

/**
 * Check if AI server is available
 */
export async function checkAIHealth(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    
    const response = await fetch(`${AI_SERVER_URL}/api/ai/health`, {
      signal: controller.signal
    });
    
    clearTimeout(timeout);
    
    if (!response.ok) return false;
    
    const data = await response.json() as any;
    return data.success === true && data.status === 'healthy';
  } catch (error) {
    console.error('[AI Integration] Health check failed:', error);
    return false;
  }
}

/**
 * Enhance NLP analysis using AI server with intelligent spell checking
 * Provides semantic understanding, handles typos, and context awareness
 */
export async function enhanceNLPWithAI(
  userMessage: string,
  quickMatch?: { intent: string; confidence: number; keywords: string[] }
): Promise<AIEnhancedNLP> {
  
  try {
    const systemPrompt = `You are Copiolate Assistant: a professional, helpful, concise assistant for BISMAN ERP.

BEHAVIOR RULES:
1. Always respect RBAC (Role-Based Access Control) - never suggest actions the user can't perform
2. If confidence < 0.8 or unknown terms detected, ask clarifying questions
3. Perform intelligent spell checking - correct typos automatically but note them
4. Be concise, friendly, and human-like
5. Never hallucinate - if unsure, ask for clarification
6. Respect privacy - don't expose PII without permission

CONFIDENCE LEVELS:
- ≥ 0.90: Confident - proceed with reply
- 0.80-0.89: Medium - suggest and ask confirmation
- < 0.80: Low - ask clarifying question

Your task: Analyze the user message, correct any spelling errors, detect intent and entities.`;

    const prompt = `${systemPrompt}

User message: "${userMessage}"
${quickMatch ? `Quick keyword match: "${quickMatch.intent}" (confidence: ${quickMatch.confidence})` : ''}

ANALYZE AND RESPOND WITH JSON ONLY (no markdown, no code blocks):
{
  "intent": "intent_name",
  "entities": [{"type": "amount", "value": "50000", "confidence": 0.95}],
  "confidence": 0.92,
  "reasoning": "brief explanation",
  "spellCorrections": [{"original": "paymnt", "corrected": "payment"}],
  "unknownTerms": []
}

COMMON ERP INTENTS:
- show_pending_tasks: View pending approvals/tasks
- show_payment_requests: List payment requests
- show_dashboard: Summary/overview
- show_notifications: View alerts/notifications
- create_payment_request: Create new payment
- search_user: Find a person (extract name as entity)
- find_user: Find a person by name (extract name as entity)
- greeting: Hello/hi/hey
- help: User needs assistance
- unknown: Cannot determine intent

ENTITY TYPES:
- amount: INR 50000, $1000
- date: 2025-11-12, today, tomorrow
- email: user@example.com
- name: Person names (extract FULL NAME for search_user/find_user intent)
- person: Same as name (for user search)
- query: Search terms, names to find
- status: pending, approved, rejected

IMPORTANT FOR USER SEARCH:
- Intent "find X" or "search X" → intent: search_user or find_user
- Extract name/person as entity: {"type": "name", "value": "full name", "confidence": 0.95}
- Examples:
  - "find suji sudharsanan" → {"intent": "search_user", "entities": [{"type": "name", "value": "suji sudharsanan"}]}
  - "search for john" → {"intent": "find_user", "entities": [{"type": "name", "value": "john"}]}
  - "who is mary smith" → {"intent": "search_user", "entities": [{"type": "name", "value": "mary smith"}]}

SPELL CHECKING RULES:
1. Correct obvious typos: "paymnt" → "payment", "reqest" → "request"
2. Note corrections in spellCorrections array
3. If a word might be domain-specific jargon, mark as unknownTerm instead
4. Use context to disambiguate: "bratualu" → ask for clarification

RETURN ONLY THE JSON OBJECT.`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), AI_TIMEOUT);
    
    const response = await fetch(`${AI_SERVER_URL}/api/ai/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        temperature: 0.3, // Lower for structured output
        maxTokens: 500
      }),
      signal: controller.signal
    });
    
    clearTimeout(timeout);
    
    if (!response.ok) {
      throw new Error(`AI server returned ${response.status}`);
    }
    
    const data = await response.json() as any;
    const aiResponse = data.response || data.text || '';
    
    // Parse JSON from AI response
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]) as AIEnhancedNLP;
      
      // Merge with quick match if available
      if (quickMatch && quickMatch.confidence > parsed.confidence) {
        return {
          intent: quickMatch.intent,
          entities: parsed.entities || [],
          confidence: quickMatch.confidence,
          reasoning: `Keyword match stronger than AI (${quickMatch.confidence} vs ${parsed.confidence})`
        };
      }
      
      return parsed;
    }
    
    // Fallback if JSON parsing fails
    console.warn('[AI Integration] Could not parse JSON from AI response:', aiResponse.substring(0, 200));
    return {
      intent: quickMatch?.intent || 'unknown',
      entities: [],
      confidence: quickMatch?.confidence || 0.5,
      reasoning: 'AI response parsing failed, using fallback'
    };
    
  } catch (error: any) {
    console.error('[AI Integration] NLP enhancement failed:', error.message);
    
    // Return quick match as fallback
    if (quickMatch) {
      return {
        intent: quickMatch.intent,
        entities: [],
        confidence: quickMatch.confidence,
        reasoning: 'AI unavailable, using keyword match'
      };
    }
    
    return {
      intent: 'unknown',
      entities: [],
      confidence: 0.3,
      reasoning: `AI error: ${error.message}`
    };
  }
}

/**
 * Generate natural, AI-powered reply with system prompt
 * Creates context-aware, conversational, human-like responses
 */
export async function generateAIReply(
  intent: string,
  userData: any,
  userMessage: string,
  context?: string
): Promise<AIGeneratedReply> {
  
  try {
    const userDataStr = typeof userData === 'string' 
      ? userData 
      : JSON.stringify(userData, null, 2);
    
    const systemPrompt = `You are Copiolate Assistant: a professional, helpful, concise assistant for BISMAN ERP.

PERSONALITY:
- Professional yet friendly
- Concise (2-4 sentences)
- Human-like and conversational
- Use emojis appropriately (👋 📊 ✅ 💰 etc.)
- Proactive - suggest next steps

RESPONSE RULES:
1. Directly address the user's question
2. Use specific data provided
3. Be honest - if unsure, say so
4. Offer helpful next actions
5. Respect user's role and permissions
6. Never expose sensitive data without permission
7. If data shows problems, acknowledge them tactfully`;

    const prompt = `${systemPrompt}

User asked: "${userMessage}"
Detected intent: ${intent}
User's data: ${userDataStr}
${context ? `Additional context: ${context}` : ''}

Generate a helpful, professional, human-like response.

EXAMPLES:
- For pending tasks: "Hi! 👋 You have 3 pending payment requests waiting for your approval. Would you like me to show them to you?"
- For greeting: "Hello! 😊 Welcome back to BISMAN ERP. How can I assist you today?"
- For errors: "I couldn't find any pending tasks for you right now. Everything looks clear! ✅"

RESPOND ONLY WITH THE REPLY TEXT (no JSON, no markdown).

Reply:`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), AI_TIMEOUT);
    
    const response = await fetch(`${AI_SERVER_URL}/api/ai/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        temperature: 0.7, // Higher for more natural responses
        maxTokens: 300
      }),
      signal: controller.signal
    });
    
    clearTimeout(timeout);
    
    if (!response.ok) {
      throw new Error(`AI server returned ${response.status}`);
    }
    
    const data = await response.json() as any;
    const aiReply = (data.response || data.text || '').trim();
    
    return {
      text: aiReply || 'I apologize, but I encountered an issue generating a response. Could you please rephrase your question?',
      confidence: 0.85,
      natural: true
    };
    
  } catch (error: any) {
    console.error('[AI Integration] Reply generation failed:', error.message);
    
    return {
      text: 'I apologize, but my AI assistant is temporarily unavailable. Please try again in a moment.',
      confidence: 0.5,
      natural: false
    };
  }
}

/**
 * Generate a clarifying question using AI with Unknown-Term Handler
 * Implements professional, concise clarification flow with RBAC awareness
 */
export async function generateClarifyingQuestionWithAI(
  userMessage: string,
  unknownTerms: string[],
  spellCorrections?: Array<{ original: string; corrected: string }>
): Promise<string> {
  
  try {
    const systemPrompt = `SYSTEM PROMPT — "Unknown-Term Handler"

When you (the assistant) detect a word, phrase, or intent you do not confidently understand, follow this flow immediately and always:

1. RBAC: Verify the user's role and permissions. If the user lacks permission to see or change the requested data, respond with a short permission-denied message and stop.
2. Acknowledge + Clarify: Politely acknowledge the unknown term and ask a single focused clarifying question. Offer 2–3 short interpretation choices when reasonable.
3. Interactive tone: Use professional, concise, friendly language. Keep clarifying questions under 20 words where possible.
4. Offer examples: When helpful, include one short sample or example of what you think the user might mean.
5. Propose next steps: Give the user 2 clear options: (A) clarify their meaning, (B) let the assistant propose a likely interpretation and ask for confirmation.
6. Logging: Log the raw message, unknown term(s), suggested interpretation(s), and timestamp to the audit store for review.
7. Candidate reply creation: If the user provides a clarified reply, ask: "Would you like me to save this as a suggested reply for future similar requests? (yes/no)". Saving requires admin or bot_trainer approval before becoming production.
8. If user confirms a proposed interpretation, proceed only after an explicit confirmation when the action modifies state (e.g., invoices, payments, user roles).
9. Keep replies short and actionable. Avoid jargon unless the user uses it first.

Always: avoid guessing when user role/permission is insufficient; ask to escalate to an admin or request permission.

SHORT READY-TO-USE CLARIFYING TEMPLATES (pick one):
• "I didn't recognize '<term>'. Do you mean A or B?"
• "Could you explain '<term>' in one short sentence?"
• "Do you mean <suggested_word> (common) or a different tool/name? Example: '<example>'."
• "Thanks — quick check: should I (1) suggest an action using this meaning, or (2) wait for your clarification?"
• "I'm unfamiliar with '<term>'. Can you give an example or paste where you saw it?"
• "Do you want me to save your clarified reply as a suggested response for future use? (yes/no)"

FRIENDLY / PROFESSIONAL PHRASING:
• Very short & polite: "I'm not sure what 'bratualu' means. Do you mean 'brutal' (tone) or something else?"
• Interactive + guided: "I don't recognize 'X'. Would you like me to (A) propose a likely meaning, or (B) wait while you explain?"
• Example-based: "Do you mean 'X' as in 'X for invoices' (yes/no)? If not, give a one-line example."
• Business formal: "The term 'X' is unfamiliar in this context. Please clarify or choose from: 1) Policy, 2) Module name, 3) Other — then I'll proceed."

MICRO UX RULES:
• Show only 1 clarifying question at a time
• When offering choices, label them (A / B / 1 / 2) so users can reply with a single token
• If user replies with free text, summarize back: "You mean: '…' — correct? (yes/no)"`;

    const spellNote = spellCorrections && spellCorrections.length > 0
      ? `\nPossible typos detected: ${spellCorrections.map(sc => `"${sc.original}" → "${sc.corrected}"`).join(', ')}`
      : '';

    const prompt = `${systemPrompt}

User message: "${userMessage}"${spellNote}
Unknown/unclear terms: ${unknownTerms.join(', ')}

Generate ONE SHORT, friendly clarifying question (max 20 words) that helps understand the user's intent.

Rules:
1. If typos were detected, confirm the correction first
2. Offer 2-3 labeled choices (A/B or 1/2) when applicable
3. Be professional and concise
4. Include a brief example if helpful
5. Keep it under 20 words

RESPOND ONLY WITH THE QUESTION (no JSON, no explanation, no markdown).

Question:`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(`${AI_SERVER_URL}/api/ai/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        temperature: 0.7,
        maxTokens: 100
      }),
      signal: controller.signal
    });
    
    clearTimeout(timeout);
    
    if (!response.ok) {
      throw new Error(`AI server returned ${response.status}`);
    }
    
    const data = await response.json() as any;
    const question = (data.response || data.text || '').trim();
    
    return question || `I'm not sure I understand. Could you please rephrase that?`;
    
  } catch (error: any) {
    console.error('[AI Integration] Clarifying question generation failed:', error.message);
    
    // Fallback to programmatic question builder
    return buildClarifyingQuestion(unknownTerms[0], spellCorrections);
  }
}

/**
 * Build clarifying question programmatically (fallback when AI unavailable)
 * Implements Unknown-Term Handler logic
 */
export function buildClarifyingQuestion(
  term: string, 
  spellCorrections?: Array<{ original: string; corrected: string }>,
  suggestions: string[] = []
): string {
  // Handle spell corrections first
  if (spellCorrections && spellCorrections.length > 0) {
    const correction = spellCorrections.find(sc => sc.original.toLowerCase() === term.toLowerCase());
    if (correction) {
      return `Did you mean "${correction.corrected}" instead of "${correction.original}"? (yes/no)`;
    }
  }
  
  const safeTerm = term && term.length > 0 ? `'${term}'` : 'that term';
  
  // No suggestions - ask for explanation
  if (!suggestions || suggestions.length === 0) {
    return `I don't recognize ${safeTerm}. Can you explain it in one short sentence?`;
  }
  
  // Format choices: "A) foo  B) bar"
  const choices = suggestions
    .slice(0, 3)
    .map((s, i) => `${String.fromCharCode(65 + i)}) ${s}`)
    .join('  ');
  
  return `I don't recognize ${safeTerm}. Do you mean ${choices}? Reply A, B (or explain).`;
}

/**
 * Summarize conversation or text using AI
 */
export async function summarizeWithAI(text: string, maxLength: number = 100): Promise<string> {
  try {
    const prompt = `Summarize the following text in ${maxLength} words or less. Focus on key points.

Text:
${text}

Summary:`;

    const response = await fetch(`${AI_SERVER_URL}/api/ai/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        temperature: 0.5,
        maxTokens: 200
      })
    });
    
    if (!response.ok) {
      throw new Error(`AI server returned ${response.status}`);
    }
    
    const data = await response.json() as any;
    return (data.response || data.text || text).trim();
    
  } catch (error) {
    console.error('[AI Integration] Summarization failed:', error);
    return text.substring(0, maxLength * 5); // Rough character count fallback
  }
}

export default {
  checkAIHealth,
  enhanceNLPWithAI,
  generateAIReply,
  generateClarifyingQuestionWithAI,
  summarizeWithAI
};
