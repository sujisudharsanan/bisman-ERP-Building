/**
 * Fuzzy Matching Service
 * Handles typo correction and similarity matching using Levenshtein distance
 */

export interface FuzzyMatchResult {
  original: string;
  corrected: string;
  confidence: number;
  distance: number;
}

export class FuzzyService {
  // Common ERP terms dictionary for spell correction
  private readonly dictionary: string[] = [
    // General
    'task', 'tasks', 'payment', 'payments', 'invoice', 'invoices',
    'approval', 'approvals', 'pending', 'approved', 'rejected',
    'create', 'update', 'delete', 'view', 'show', 'display',
    
    // Finance
    'salary', 'payslip', 'expense', 'expenses', 'vendor', 'vendors',
    'supplier', 'suppliers', 'bill', 'bills', 'revenue', 'profit',
    
    // HR
    'attendance', 'leave', 'vacation', 'employee', 'employees',
    'staff', 'department', 'departments', 'manager', 'managers',
    
    // Operations
    'inventory', 'stock', 'items', 'warehouse', 'hub', 'hubs',
    'vehicle', 'vehicles', 'fleet', 'tracking', 'location',
    
    // Fuel/Petrol
    'fuel', 'petrol', 'diesel', 'gas', 'consumption', 'usage',
    
    // Reports
    'report', 'reports', 'analytics', 'dashboard', 'summary',
    'statistics', 'metrics', 'performance',
    
    // Time
    'today', 'tomorrow', 'yesterday', 'week', 'month', 'year',
    'morning', 'afternoon', 'evening', 'night', 'monday', 'tuesday',
    'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
    
    // Actions
    'schedule', 'remind', 'reminder', 'notification', 'alert',
    'search', 'find', 'locate', 'get', 'fetch', 'retrieve',
  ];

  /**
   * Calculate Levenshtein distance between two strings
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const len1 = str1.length;
    const len2 = str2.length;
    const matrix: number[][] = [];

    // Initialize matrix
    for (let i = 0; i <= len1; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= len2; j++) {
      matrix[0][j] = j;
    }

    // Fill matrix
    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1, // deletion
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j - 1] + cost // substitution
        );
      }
    }

    return matrix[len1][len2];
  }

  /**
   * Calculate similarity score (0-1) between two strings
   */
  private similarity(str1: string, str2: string): number {
    const distance = this.levenshteinDistance(str1.toLowerCase(), str2.toLowerCase());
    const maxLen = Math.max(str1.length, str2.length);
    return maxLen === 0 ? 1 : 1 - distance / maxLen;
  }

  /**
   * Find best match from dictionary
   */
  findBestMatch(word: string, threshold: number = 0.7): FuzzyMatchResult | null {
    const normalizedWord = word.toLowerCase().trim();
    
    // Exact match
    if (this.dictionary.includes(normalizedWord)) {
      return {
        original: word,
        corrected: normalizedWord,
        confidence: 1.0,
        distance: 0,
      };
    }

    let bestMatch: string | null = null;
    let bestScore = 0;
    let bestDistance = Infinity;

    // Find closest match
    for (const dictWord of this.dictionary) {
      const score = this.similarity(normalizedWord, dictWord);
      const distance = this.levenshteinDistance(normalizedWord, dictWord);

      if (score > bestScore && score >= threshold) {
        bestScore = score;
        bestMatch = dictWord;
        bestDistance = distance;
      }
    }

    if (bestMatch) {
      return {
        original: word,
        corrected: bestMatch,
        confidence: bestScore,
        distance: bestDistance,
      };
    }

    return null;
  }

  /**
   * Correct typos in a sentence
   */
  correctSentence(text: string, threshold: number = 0.7): string {
    const words = text.split(/\s+/);
    const correctedWords = words.map((word) => {
      // Keep punctuation
      const match = word.match(/^([^\w]*)([\w]+)([^\w]*)$/);
      if (!match) return word;

      const [, prefix, cleanWord, suffix] = match;
      const result = this.findBestMatch(cleanWord, threshold);
      
      if (result && result.confidence > 0.8) {
        return prefix + result.corrected + suffix;
      }
      
      return word;
    });

    return correctedWords.join(' ');
  }

  /**
   * Find all possible corrections for a word
   */
  findAllMatches(word: string, topN: number = 5): FuzzyMatchResult[] {
    const normalizedWord = word.toLowerCase().trim();
    const matches: Array<{ word: string; score: number; distance: number }> = [];

    for (const dictWord of this.dictionary) {
      const score = this.similarity(normalizedWord, dictWord);
      const distance = this.levenshteinDistance(normalizedWord, dictWord);

      if (score > 0.5) {
        matches.push({ word: dictWord, score, distance });
      }
    }

    return matches
      .sort((a, b) => b.score - a.score)
      .slice(0, topN)
      .map((m) => ({
        original: word,
        corrected: m.word,
        confidence: m.score,
        distance: m.distance,
      }));
  }

  /**
   * Check if text contains typos
   */
  hasTypos(text: string, threshold: number = 0.85): boolean {
    const words = text.toLowerCase().split(/\s+/);
    
    for (const word of words) {
      const cleanWord = word.replace(/[^\w]/g, '');
      if (cleanWord.length < 3) continue; // Skip short words
      
      if (!this.dictionary.includes(cleanWord)) {
        const match = this.findBestMatch(cleanWord, threshold);
        if (match && match.confidence > threshold && match.distance > 0) {
          return true;
        }
      }
    }
    
    return false;
  }

  /**
   * Get corrected version with suggestions
   */
  getCorrectionSuggestions(text: string): {
    original: string;
    corrected: string;
    changes: Array<{ original: string; suggested: string; confidence: number }>;
  } {
    const words = text.split(/\s+/);
    const changes: Array<{ original: string; suggested: string; confidence: number }> = [];
    const correctedWords: string[] = [];

    for (const word of words) {
      const match = word.match(/^([^\w]*)([\w]+)([^\w]*)$/);
      if (!match) {
        correctedWords.push(word);
        continue;
      }

      const [, prefix, cleanWord, suffix] = match;
      const result = this.findBestMatch(cleanWord, 0.7);

      if (result && result.confidence > 0.8 && result.corrected !== cleanWord.toLowerCase()) {
        changes.push({
          original: cleanWord,
          suggested: result.corrected,
          confidence: result.confidence,
        });
        correctedWords.push(prefix + result.corrected + suffix);
      } else {
        correctedWords.push(word);
      }
    }

    return {
      original: text,
      corrected: correctedWords.join(' '),
      changes,
    };
  }

  /**
   * Add custom words to dictionary
   */
  addToDictionary(words: string[]): void {
    for (const word of words) {
      const normalized = word.toLowerCase().trim();
      if (!this.dictionary.includes(normalized)) {
        this.dictionary.push(normalized);
      }
    }
  }

  /**
   * Calculate text quality score (0-1)
   */
  getTextQualityScore(text: string): number {
    const words = text.toLowerCase().split(/\s+/);
    let matchCount = 0;
    let totalWords = 0;

    for (const word of words) {
      const cleanWord = word.replace(/[^\w]/g, '');
      if (cleanWord.length < 2) continue;

      totalWords++;
      if (this.dictionary.includes(cleanWord)) {
        matchCount++;
      } else {
        const match = this.findBestMatch(cleanWord, 0.8);
        if (match && match.confidence > 0.9) {
          matchCount += match.confidence;
        }
      }
    }

    return totalWords > 0 ? matchCount / totalWords : 0;
  }
}

export const fuzzyService = new FuzzyService();
