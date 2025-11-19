/**
 * Intent Detection Service
 * Identifies user intent from chat messages using pattern matching and fuzzy logic
 */

export interface IntentResult {
  intent: string;
  confidence: number;
  patterns: string[];
  keywords: string[];
}

export type Intent =
  | 'show_pending_tasks'
  | 'create_task'
  | 'create_payment_request'
  | 'check_inventory'
  | 'check_attendance'
  | 'request_leave'
  | 'view_dashboard'
  | 'search_user'
  | 'get_approval_status'
  | 'view_reports'
  | 'salary_info'
  | 'vehicle_info'
  | 'hub_info'
  | 'fuel_expense'
  | 'vendor_payments'
  | 'schedule_meeting'
  | 'check_notifications'
  | 'update_profile'
  | 'unknown';

interface IntentPattern {
  intent: Intent;
  patterns: RegExp[];
  keywords: string[];
  weight: number;
}

// Comprehensive intent patterns
const INTENT_PATTERNS: IntentPattern[] = [
  {
    intent: 'show_pending_tasks',
    patterns: [
      /\b(show|list|display|view|get|check)\s+(my\s+)?(pending|outstanding|open|active|current)\s+(tasks?|to[-\s]?dos?|assignments?)\b/i,
      /\b(what|which)\s+(tasks?|assignments?|to[-\s]?dos?)\s+(are|do\s+i\s+have)\s+(pending|outstanding|open)\b/i,
      /\bmy\s+(pending|open)\s+(tasks?|work)\b/i,
      /\b(tasks?|to[-\s]?dos?)\s+(pending|due|left)\b/i,
    ],
    keywords: ['pending', 'tasks', 'show', 'list', 'my', 'open', 'outstanding'],
    weight: 1.0,
  },
  {
    intent: 'create_task',
    patterns: [
      /\b(create|add|new|make|schedule|set)\s+(a\s+)?(task|to[-\s]?do|reminder|assignment)\b/i,
      /\b(remind|schedule)\s+me\s+(to|about)\b/i,
      /\btask\s+(for|on|at|by)\b/i,
      /\b(need\s+to|have\s+to|should)\s+(create|add|make)\b/i,
      /\bschedule\s+(followup|follow[-\s]?up|meeting)\b/i,
    ],
    keywords: ['create', 'task', 'remind', 'schedule', 'add', 'new', 'reminder'],
    weight: 1.0,
  },
  {
    intent: 'create_payment_request',
    patterns: [
      /\b(create|make|raise|submit|send)\s+(a\s+)?(payment|pay)\s+(request|requisition|req)\b/i,
      /\b(request|need|want)\s+(payment|money|funds)\s+(for|to)\b/i,
      /\b(pay|payment)\s+(vendor|supplier|bill|invoice)\b/i,
      /\bprocess\s+(payment|pay)\b/i,
    ],
    keywords: ['payment', 'request', 'create', 'pay', 'vendor', 'invoice'],
    weight: 1.0,
  },
  {
    intent: 'check_inventory',
    patterns: [
      /\b(check|view|show|display|get)\s+(the\s+)?(inventory|stock|items?)\b/i,
      /\b(how\s+much|what|which)\s+(inventory|stock|items?)\b/i,
      /\binventory\s+(level|status|count)\b/i,
      /\b(stock|inventory)\s+(available|remaining|left)\b/i,
    ],
    keywords: ['inventory', 'stock', 'check', 'items', 'level', 'available'],
    weight: 1.0,
  },
  {
    intent: 'check_attendance',
    patterns: [
      /\b(check|view|show|see|get)\s+(my\s+)?(attendance|presence|attendance\s+record)\b/i,
      /\b(how\s+many)\s+(days|hours)\s+(present|attended|worked)\b/i,
      /\b(mark|take|record)\s+attendance\b/i,
      /\battendance\s+(report|summary|status)\b/i,
    ],
    keywords: ['attendance', 'check', 'present', 'record', 'mark'],
    weight: 1.0,
  },
  {
    intent: 'request_leave',
    patterns: [
      /\b(request|apply|take|need)\s+(for\s+)?(leave|time\s+off|vacation|holiday|absence)\b/i,
      /\b(leave|vacation)\s+(request|application|approval)\b/i,
      /\bi\s+(need|want)\s+(to\s+)?(take|go\s+on)\s+(leave|vacation)\b/i,
      /\bapply\s+for\s+(sick|casual|earned)\s+leave\b/i,
    ],
    keywords: ['leave', 'request', 'vacation', 'apply', 'time off', 'holiday'],
    weight: 1.0,
  },
  {
    intent: 'view_dashboard',
    patterns: [
      /\b(show|view|open|display|see|go\s+to)\s+(the\s+)?(dashboard|home|overview|main\s+page)\b/i,
      /\b(dashboard|overview)\s+(view|page)\b/i,
      /\btake\s+me\s+to\s+(dashboard|home)\b/i,
    ],
    keywords: ['dashboard', 'view', 'show', 'home', 'overview'],
    weight: 1.0,
  },
  {
    intent: 'search_user',
    patterns: [
      /\b(search|find|look\s+for|locate|get)\s+(user|employee|person|staff|member)\b/i,
      /\b(who|which)\s+(user|employee|person)\b/i,
      /\bfind\s+(contact|details)\s+(of|for)\b/i,
      /\buser\s+(info|information|details|profile)\b/i,
    ],
    keywords: ['search', 'user', 'find', 'employee', 'person', 'locate'],
    weight: 1.0,
  },
  {
    intent: 'get_approval_status',
    patterns: [
      /\b(check|get|view|see|show)\s+(approval|approval\s+status|status)\b/i,
      /\b(what|which)\s+(is\s+the\s+)?(status|approval)\s+(of|for)\b/i,
      /\b(approval|request)\s+(status|pending|approved|rejected)\b/i,
      /\bhas\s+(my|the)\s+(request|approval)\s+been\b/i,
    ],
    keywords: ['approval', 'status', 'check', 'request', 'pending', 'approved'],
    weight: 1.0,
  },
  {
    intent: 'view_reports',
    patterns: [
      /\b(view|show|generate|display|see|get)\s+(report|reports|analytics)\b/i,
      /\b(sales|expense|revenue|attendance|inventory)\s+report\b/i,
      /\breport\s+(for|on|of)\b/i,
      /\bgenerate\s+(summary|report)\b/i,
    ],
    keywords: ['report', 'view', 'generate', 'analytics', 'summary'],
    weight: 1.0,
  },
  {
    intent: 'salary_info',
    patterns: [
      /\b(check|view|show|see|get)\s+(my\s+)?(salary|pay|payslip|wage|compensation)\b/i,
      /\b(how\s+much|what)\s+(is|am\s+i)\s+(getting|earning|paid)\b/i,
      /\bpayslip\s+(for|of)\b/i,
      /\bsalary\s+(slip|details|info|information)\b/i,
    ],
    keywords: ['salary', 'pay', 'payslip', 'wage', 'compensation', 'earning'],
    weight: 1.0,
  },
  {
    intent: 'vehicle_info',
    patterns: [
      /\b(check|view|show|see|get)\s+(vehicle|car|truck|fleet)\s+(info|information|details|status)\b/i,
      /\b(vehicle|fleet)\s+(tracking|location|status)\b/i,
      /\b(my|the)\s+vehicle\b/i,
      /\bcar\s+(details|info|registration)\b/i,
    ],
    keywords: ['vehicle', 'car', 'fleet', 'tracking', 'info', 'truck'],
    weight: 1.0,
  },
  {
    intent: 'hub_info',
    patterns: [
      /\b(check|view|show|see|get)\s+(hub|branch|location|site)\s+(info|information|details)\b/i,
      /\b(hub|branch)\s+(status|details|performance)\b/i,
      /\b(which|what)\s+(hubs?|branches?|locations?)\b/i,
      /\bhub\s+(performance|metrics|data)\b/i,
    ],
    keywords: ['hub', 'branch', 'location', 'site', 'info', 'details'],
    weight: 1.0,
  },
  {
    intent: 'fuel_expense',
    patterns: [
      /\b(check|view|show|add|create)\s+(fuel|petrol|diesel)\s+(expense|cost|bill)\b/i,
      /\b(fuel|petrol|diesel)\s+(consumption|usage|expense)\b/i,
      /\brecord\s+fuel\b/i,
      /\bgas\s+(expense|cost|bill)\b/i,
    ],
    keywords: ['fuel', 'expense', 'petrol', 'diesel', 'cost', 'gas'],
    weight: 1.0,
  },
  {
    intent: 'vendor_payments',
    patterns: [
      /\b(check|view|show|make)\s+(vendor|supplier)\s+(payment|pay)\b/i,
      /\b(pay|payment)\s+(to\s+)?(vendor|supplier)\b/i,
      /\bvendor\s+(list|details|info)\b/i,
      /\bsupplier\s+(payment|invoice)\b/i,
    ],
    keywords: ['vendor', 'payment', 'supplier', 'pay', 'invoice'],
    weight: 1.0,
  },
  {
    intent: 'schedule_meeting',
    patterns: [
      /\b(schedule|arrange|set\s+up|book|create)\s+(a\s+)?(meeting|call|conference)\b/i,
      /\bmeeting\s+(with|for|at)\b/i,
      /\bbook\s+(room|conference)\b/i,
    ],
    keywords: ['schedule', 'meeting', 'arrange', 'call', 'conference'],
    weight: 1.0,
  },
  {
    intent: 'check_notifications',
    patterns: [
      /\b(check|view|show|see)\s+(my\s+)?(notifications?|alerts?|messages?)\b/i,
      /\b(any|what)\s+(new\s+)?(notifications?|alerts?|updates?)\b/i,
      /\bnotification\s+(center|list)\b/i,
    ],
    keywords: ['notifications', 'alerts', 'check', 'messages', 'updates'],
    weight: 1.0,
  },
  {
    intent: 'update_profile',
    patterns: [
      /\b(update|edit|change|modify)\s+(my\s+)?(profile|info|information|details)\b/i,
      /\b(change|update)\s+(password|email|phone|contact)\b/i,
      /\bprofile\s+(settings|update|edit)\b/i,
    ],
    keywords: ['update', 'profile', 'edit', 'change', 'settings'],
    weight: 1.0,
  },
];

export class IntentService {
  /**
   * Detect intent from user message
   */
  detectIntent(text: string): IntentResult {
    const normalizedText = text.toLowerCase().trim();
    const scores: Map<Intent, number> = new Map();

    // Score each intent
    for (const intentPattern of INTENT_PATTERNS) {
      let score = 0;

      // Pattern matching (high weight)
      for (const pattern of intentPattern.patterns) {
        if (pattern.test(normalizedText)) {
          score += 0.6;
          break; // Only count first match
        }
      }

      // Keyword matching (lower weight)
      const keywordMatches = intentPattern.keywords.filter((keyword) =>
        normalizedText.includes(keyword.toLowerCase())
      );
      const keywordScore = (keywordMatches.length / intentPattern.keywords.length) * 0.4;
      score += keywordScore;

      // Apply intent weight
      score *= intentPattern.weight;

      if (score > 0) {
        scores.set(intentPattern.intent, score);
      }
    }

    // Find highest scoring intent
    let bestIntent: Intent = 'unknown';
    let bestScore = 0;
    let bestPatterns: string[] = [];
    let bestKeywords: string[] = [];

    for (const [intent, score] of scores.entries()) {
      if (score > bestScore) {
        bestScore = score;
        bestIntent = intent;
        const pattern = INTENT_PATTERNS.find((p) => p.intent === intent);
        if (pattern) {
          bestPatterns = pattern.patterns.map((p) => p.source);
          bestKeywords = pattern.keywords;
        }
      }
    }

    // Normalize confidence to 0-1 range
    const confidence = Math.min(bestScore, 1.0);

    return {
      intent: bestIntent,
      confidence,
      patterns: bestPatterns,
      keywords: bestKeywords,
    };
  }

  /**
   * Get suggested intents when confidence is low
   */
  getSuggestedIntents(text: string, topN: number = 3): IntentResult[] {
    const normalizedText = text.toLowerCase().trim();
    const scores: Array<{ intent: Intent; score: number; patterns: string[]; keywords: string[] }> =
      [];

    for (const intentPattern of INTENT_PATTERNS) {
      let score = 0;

      // Pattern matching
      for (const pattern of intentPattern.patterns) {
        if (pattern.test(normalizedText)) {
          score += 0.6;
          break;
        }
      }

      // Keyword matching
      const keywordMatches = intentPattern.keywords.filter((keyword) =>
        normalizedText.includes(keyword.toLowerCase())
      );
      const keywordScore = (keywordMatches.length / intentPattern.keywords.length) * 0.4;
      score += keywordScore;

      score *= intentPattern.weight;

      if (score > 0) {
        scores.push({
          intent: intentPattern.intent,
          score,
          patterns: intentPattern.patterns.map((p) => p.source),
          keywords: intentPattern.keywords,
        });
      }
    }

    // Sort by score and take top N
    return scores
      .sort((a, b) => b.score - a.score)
      .slice(0, topN)
      .map((s) => ({
        intent: s.intent,
        confidence: Math.min(s.score, 1.0),
        patterns: s.patterns,
        keywords: s.keywords,
      }));
  }

  /**
   * Get human-readable intent name
   */
  getIntentDisplayName(intent: Intent): string {
    const displayNames: Record<Intent, string> = {
      show_pending_tasks: 'Show Pending Tasks',
      create_task: 'Create Task',
      create_payment_request: 'Create Payment Request',
      check_inventory: 'Check Inventory',
      check_attendance: 'Check Attendance',
      request_leave: 'Request Leave',
      view_dashboard: 'View Dashboard',
      search_user: 'Search User',
      get_approval_status: 'Get Approval Status',
      view_reports: 'View Reports',
      salary_info: 'Salary Information',
      vehicle_info: 'Vehicle Information',
      hub_info: 'Hub Information',
      fuel_expense: 'Fuel Expense',
      vendor_payments: 'Vendor Payments',
      schedule_meeting: 'Schedule Meeting',
      check_notifications: 'Check Notifications',
      update_profile: 'Update Profile',
      unknown: 'Unknown Intent',
    };

    return displayNames[intent] || 'Unknown';
  }
}

export const intentService = new IntentService();
