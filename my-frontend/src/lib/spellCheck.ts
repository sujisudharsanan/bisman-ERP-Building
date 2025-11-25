/**
 * Spell Check Utility
 * Simple spell checking for task creation
 */

export interface SpellCheckError {
  word: string;
  suggestions: string[];
  position: number;
}

export interface SpellCheckResult {
  hasErrors: boolean;
  errors: SpellCheckError[];
  corrections: string[];
}

// Common misspellings dictionary
const COMMON_MISSPELLINGS: Record<string, string> = {
  // Common business terms
  'recieve': 'receive',
  'occured': 'occurred',
  'occurence': 'occurrence',
  'seperate': 'separate',
  'untill': 'until',
  'sucessful': 'successful',
  'sucess': 'success',
  'accomodate': 'accommodate',
  'acheive': 'achieve',
  'beleive': 'believe',
  'definately': 'definitely',
  'enviroment': 'environment',
  'goverment': 'government',
  'harrass': 'harass',
  'independant': 'independent',
  'occassion': 'occasion',
  'prefered': 'preferred',
  'recomend': 'recommend',
  'refered': 'referred',
  'relevent': 'relevant',
  'tommorow': 'tomorrow',
  'wierd': 'weird',
  
  // Task-specific terms
  'aprove': 'approve',
  'aproval': 'approval',
  'assignee': 'assignee', // correct
  'compleat': 'complete',
  'prioritize': 'prioritize', // correct
  'schedual': 'schedule',
  'managment': 'management',
  'develope': 'develop',
  'analize': 'analyze',
  'finalize': 'finalize', // correct
};

// Words to ignore (technical terms, acronyms)
const IGNORE_WORDS = new Set([
  'api', 'apis', 'ui', 'ux', 'erp', 'crm', 'sql', 'json', 'jwt',
  'http', 'https', 'url', 'pdf', 'csv', 'xlsx',
  'admin', 'auth', 'oauth', 'saas', 'kpi', 'roi',
  'todo', 'todos', 'kanban', 'scrum', 'agile',
  'backend', 'frontend', 'fullstack',
]);

/**
 * Check text for spelling errors
 */
export const checkSpelling = (text: string): SpellCheckResult => {
  if (!text || text.trim().length === 0) {
    return {
      hasErrors: false,
      errors: [],
      corrections: [],
    };
  }

  // Split into words, keeping track of positions
  const words = text.match(/\b[a-zA-Z]+\b/g) || [];
  const errors: SpellCheckError[] = [];
  const corrections: string[] = [];

  words.forEach((word, index) => {
    const lowerWord = word.toLowerCase();
    
    // Skip if in ignore list
    if (IGNORE_WORDS.has(lowerWord)) {
      return;
    }

    // Skip very short words (likely ok)
    if (word.length <= 2) {
      return;
    }

    // Check if misspelled
    if (COMMON_MISSPELLINGS[lowerWord]) {
      const correct = COMMON_MISSPELLINGS[lowerWord];
      
      errors.push({
        word,
        suggestions: [correct],
        position: index,
      });

      corrections.push(`"${word}" → "${correct}"`);
    }
  });

  return {
    hasErrors: errors.length > 0,
    errors,
    corrections,
  };
};

/**
 * Auto-correct text
 */
export const autoCorrect = (text: string): string => {
  if (!text) return text;

  let correctedText = text;

  Object.entries(COMMON_MISSPELLINGS).forEach(([wrong, correct]) => {
    // Replace whole words only (case insensitive)
    const regex = new RegExp(`\\b${wrong}\\b`, 'gi');
    correctedText = correctedText.replace(regex, (match) => {
      // Preserve original case
      if (match[0] === match[0].toUpperCase()) {
        return correct.charAt(0).toUpperCase() + correct.slice(1);
      }
      return correct;
    });
  });

  return correctedText;
};

/**
 * Check if a word is spelled correctly
 */
export const isCorrect = (word: string): boolean => {
  const lowerWord = word.toLowerCase();
  
  // Check if in ignore list
  if (IGNORE_WORDS.has(lowerWord)) {
    return true;
  }

  // Check if in misspellings dictionary
  return !COMMON_MISSPELLINGS[lowerWord];
};

/**
 * Get suggestions for a word
 */
export const getSuggestions = (word: string): string[] => {
  const lowerWord = word.toLowerCase();
  
  if (COMMON_MISSPELLINGS[lowerWord]) {
    return [COMMON_MISSPELLINGS[lowerWord]];
  }

  return [];
};

/**
 * Add custom word to ignore list
 */
export const addToIgnoreList = (word: string): void => {
  IGNORE_WORDS.add(word.toLowerCase());
};

/**
 * Format spell check result for display
 */
export const formatSpellCheckResult = (result: SpellCheckResult): string => {
  if (!result.hasErrors) {
    return '✓ No spelling errors detected';
  }

  return `Found ${result.errors.length} potential spelling ${result.errors.length === 1 ? 'error' : 'errors'}`;
};
