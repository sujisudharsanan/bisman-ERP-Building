/**
 * BISMAN ERP - Intent Detection System
 * Parses user messages to detect intent and extract entities
 * WITHOUT requiring an LLM - uses pattern matching and keywords
 */

/**
 * @typedef {'GREETING' | 'THANKS' | 'BYE' | 'HELP' | 'COD_QUERY' | 'TASK_QUERY' | 'TASK_CREATE' | 'INVOICE_QUERY' | 'PAYMENT_QUERY' | 'DASHBOARD' | 'REPORT' | 'UNKNOWN'} Intent
 */

/**
 * @typedef {Object} ParsedIntent
 * @property {Intent} intent - The detected intent
 * @property {Object} entities - Extracted entities from the message
 * @property {string} [entities.branchName] - Detected branch name
 * @property {'TODAY' | 'YESTERDAY' | 'THIS_WEEK' | 'LAST_WEEK' | 'THIS_MONTH' | 'LAST_MONTH'} [entities.dateRange] - Detected time period
 * @property {string} [entities.status] - Status filter (pending, completed, overdue, etc.)
 * @property {number} [entities.confidence] - Confidence score 0-1
 */

/**
 * Branch name mappings (case-insensitive)
 */
const branchPatterns = {
  chennai: ['chennai', 'chen', 'tamilnadu', 'tn'],
  mumbai: ['mumbai', 'mum', 'bombay', 'maharashtra', 'mh'],
  bangalore: ['bangalore', 'bengaluru', 'blr', 'karnataka', 'ka'],
  delhi: ['delhi', 'del', 'new delhi', 'ncr'],
  hyderabad: ['hyderabad', 'hyd', 'telangana', 'ts'],
  pune: ['pune', 'pun'],
  kolkata: ['kolkata', 'calcutta', 'kol', 'west bengal', 'wb'],
};

/**
 * Date range patterns
 */
const datePatterns = {
  TODAY: ['today', 'now', 'current', 'right now', 'this moment'],
  YESTERDAY: ['yesterday', 'last day'],
  THIS_WEEK: ['this week', 'current week', 'week so far'],
  LAST_WEEK: ['last week', 'previous week', 'past week'],
  THIS_MONTH: ['this month', 'current month', 'month so far'],
  LAST_MONTH: ['last month', 'previous month', 'past month'],
};

/**
 * Status patterns
 */
const statusPatterns = {
  pending: ['pending', 'due', 'outstanding', 'waiting', 'unpaid'],
  completed: ['completed', 'done', 'finished', 'closed', 'paid'],
  overdue: ['overdue', 'late', 'delayed', 'past due'],
  inprogress: ['in progress', 'ongoing', 'active', 'working on'],
};

/**
 * Detect branch name from message
 * @param {string} text - Lowercase message text
 * @returns {string | undefined}
 */
function detectBranch(text) {
  for (const [branch, patterns] of Object.entries(branchPatterns)) {
    if (patterns.some(pattern => text.includes(pattern))) {
      // Return capitalized version
      return branch.charAt(0).toUpperCase() + branch.slice(1);
    }
  }
  return undefined;
}

/**
 * Detect date range from message
 * @param {string} text - Lowercase message text
 * @returns {ParsedIntent['entities']['dateRange'] | undefined}
 */
function detectDateRange(text) {
  for (const [range, patterns] of Object.entries(datePatterns)) {
    if (patterns.some(pattern => text.includes(pattern))) {
      return range;
    }
  }
  return undefined;
}

/**
 * Detect status filter from message
 * @param {string} text - Lowercase message text
 * @returns {string | undefined}
 */
function detectStatus(text) {
  for (const [status, patterns] of Object.entries(statusPatterns)) {
    if (patterns.some(pattern => text.includes(pattern))) {
      return status;
    }
  }
  return undefined;
}

/**
 * Main intent detection function
 * @param {string} message - User's message
 * @returns {ParsedIntent}
 */
function detectIntent(message) {
  const text = message.toLowerCase().trim();
  let confidence = 0.7; // Default confidence

  // Early exit for empty messages
  if (!text) {
    return { intent: 'UNKNOWN', entities: { confidence: 0 } };
  }

  // Extract common entities
  const branchName = detectBranch(text);
  const dateRange = detectDateRange(text);
  const status = detectStatus(text);

  // ==================== SMALL TALK ====================
  
  // Greetings
  if (/(^hi\b|^hello\b|^hey\b|good (morning|afternoon|evening)|howdy|sup\b)/i.test(text)) {
    return { 
      intent: 'GREETING', 
      entities: { confidence: 0.95 } 
    };
  }

  // Thanks
  if (/thank(s| you)|thx|tnx|appreciate|grateful/i.test(text)) {
    return { 
      intent: 'THANKS', 
      entities: { confidence: 0.95 } 
    };
  }

  // Goodbye
  if (/(^bye\b|^goodbye\b|see you|catch you|talk later|gotta go)/i.test(text)) {
    return { 
      intent: 'BYE', 
      entities: { confidence: 0.95 } 
    };
  }

  // Help requests
  if (/(help|how to|can you|what can you|assist|guide|support|show me how)/i.test(text)) {
    return { 
      intent: 'HELP', 
      entities: { confidence: 0.9 } 
    };
  }

  // ==================== BUSINESS INTENTS ====================

  // COD Queries
  if (/(cod|cash on delivery|collection)/i.test(text)) {
    confidence = 0.85;
    if (branchName && dateRange) confidence = 0.95;
    return {
      intent: 'COD_QUERY',
      entities: { branchName, dateRange, status, confidence },
    };
  }

  // Task Queries
  if (/task/i.test(text)) {
    // Check if it's task creation
    if (/(create|add|new|make|assign)/i.test(text)) {
      return {
        intent: 'TASK_CREATE',
        entities: { confidence: 0.9 },
      };
    }
    // Task query
    confidence = 0.85;
    if (dateRange || status) confidence = 0.9;
    return {
      intent: 'TASK_QUERY',
      entities: { dateRange, status, confidence },
    };
  }

  // Invoice/Bill Queries
  if (/(invoice|bill|billing)/i.test(text)) {
    confidence = 0.85;
    if (branchName && dateRange) confidence = 0.95;
    return {
      intent: 'INVOICE_QUERY',
      entities: { branchName, dateRange, status, confidence },
    };
  }

  // Payment Queries
  if (/(payment|pay|salary|expense|reimburs)/i.test(text)) {
    confidence = 0.85;
    if (branchName || dateRange) confidence = 0.9;
    return {
      intent: 'PAYMENT_QUERY',
      entities: { branchName, dateRange, status, confidence },
    };
  }

  // Dashboard requests
  if (/(dashboard|overview|summary|stats|statistics)/i.test(text)) {
    return {
      intent: 'DASHBOARD',
      entities: { branchName, dateRange, confidence: 0.85 },
    };
  }

  // Report generation
  if (/(report|export|download|generate|pdf|excel)/i.test(text)) {
    return {
      intent: 'REPORT',
      entities: { branchName, dateRange, confidence: 0.85 },
    };
  }

  // ==================== FALLBACK ====================
  
  return {
    intent: 'UNKNOWN',
    entities: { branchName, dateRange, status, confidence: 0.3 },
  };
}

/**
 * Get suggested clarifications based on intent and missing entities
 * @param {ParsedIntent} parsedIntent
 * @returns {string[]} Array of clarification questions
 */
function getSuggestedClarifications(parsedIntent) {
  const { intent, entities } = parsedIntent;
  const suggestions = [];

  // If branch-dependent query without branch
  if (['COD_QUERY', 'INVOICE_QUERY', 'PAYMENT_QUERY'].includes(intent)) {
    if (!entities.branchName) {
      suggestions.push('Which branch would you like to check?');
    }
    if (!entities.dateRange) {
      suggestions.push('For which time period? (e.g., today, this week, last month)');
    }
  }

  // If task query without time or status
  if (intent === 'TASK_QUERY') {
    if (!entities.dateRange && !entities.status) {
      suggestions.push('Would you like to see all tasks, or filter by status/date?');
    }
  }

  return suggestions;
}

module.exports = {
  detectIntent,
  getSuggestedClarifications,
  detectBranch,
  detectDateRange,
  detectStatus,
};
