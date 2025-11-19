/**
 * Date Parser Utility
 * Parses natural language dates and times
 */

export interface DateParseResult {
  date: Date;
  raw: string;
  type: 'relative' | 'absolute' | 'named';
}

export class DateParser {
  /**
   * Parse natural language date
   */
  parseDate(text: string): DateParseResult | null {
    const lowercaseText = text.toLowerCase();

    // Try relative dates first
    const relativeDate = this.parseRelativeDate(lowercaseText);
    if (relativeDate) return relativeDate;

    // Try named dates
    const namedDate = this.parseNamedDate(lowercaseText);
    if (namedDate) return namedDate;

    // Try absolute dates
    const absoluteDate = this.parseAbsoluteDate(text);
    if (absoluteDate) return absoluteDate;

    return null;
  }

  /**
   * Parse relative dates (today, tomorrow, next week, etc.)
   */
  private parseRelativeDate(text: string): DateParseResult | null {
    const now = new Date();
    
    // Today
    if (/\btoday\b/.test(text)) {
      return {
        date: now,
        raw: 'today',
        type: 'relative',
      };
    }

    // Tomorrow
    if (/\btomorrow\b/.test(text)) {
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      return {
        date: tomorrow,
        raw: 'tomorrow',
        type: 'relative',
      };
    }

    // Yesterday
    if (/\byesterday\b/.test(text)) {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      return {
        date: yesterday,
        raw: 'yesterday',
        type: 'relative',
      };
    }

    // Next X days
    const nextDaysMatch = text.match(/\bnext\s+(\d+)\s+days?\b/);
    if (nextDaysMatch) {
      const days = parseInt(nextDaysMatch[1]);
      const future = new Date(now);
      future.setDate(future.getDate() + days);
      return {
        date: future,
        raw: nextDaysMatch[0],
        type: 'relative',
      };
    }

    // In X days
    const inDaysMatch = text.match(/\bin\s+(\d+)\s+days?\b/);
    if (inDaysMatch) {
      const days = parseInt(inDaysMatch[1]);
      const future = new Date(now);
      future.setDate(future.getDate() + days);
      return {
        date: future,
        raw: inDaysMatch[0],
        type: 'relative',
      };
    }

    // Next week
    if (/\bnext\s+week\b/.test(text)) {
      const nextWeek = new Date(now);
      nextWeek.setDate(nextWeek.getDate() + 7);
      return {
        date: nextWeek,
        raw: 'next week',
        type: 'relative',
      };
    }

    // Next month
    if (/\bnext\s+month\b/.test(text)) {
      const nextMonth = new Date(now);
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      return {
        date: nextMonth,
        raw: 'next month',
        type: 'relative',
      };
    }

    // This week/month
    if (/\bthis\s+week\b/.test(text)) {
      return {
        date: now,
        raw: 'this week',
        type: 'relative',
      };
    }

    if (/\bthis\s+month\b/.test(text)) {
      return {
        date: now,
        raw: 'this month',
        type: 'relative',
      };
    }

    return null;
  }

  /**
   * Parse named dates (next Monday, this Friday, etc.)
   */
  private parseNamedDate(text: string): DateParseResult | null {
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const now = new Date();
    const currentDay = now.getDay();

    // Next [day]
    for (let i = 0; i < dayNames.length; i++) {
      const pattern = new RegExp(`\\bnext\\s+${dayNames[i]}\\b`, 'i');
      if (pattern.test(text)) {
        const targetDay = i;
        const daysUntil = ((targetDay - currentDay + 7) % 7) || 7;
        const date = new Date(now);
        date.setDate(date.getDate() + daysUntil);
        return {
          date,
          raw: `next ${dayNames[i]}`,
          type: 'named',
        };
      }
    }

    // This [day]
    for (let i = 0; i < dayNames.length; i++) {
      const pattern = new RegExp(`\\bthis\\s+${dayNames[i]}\\b`, 'i');
      if (pattern.test(text)) {
        const targetDay = i;
        const daysUntil = ((targetDay - currentDay + 7) % 7);
        const date = new Date(now);
        date.setDate(date.getDate() + daysUntil);
        return {
          date,
          raw: `this ${dayNames[i]}`,
          type: 'named',
        };
      }
    }

    // Just day name (assume next occurrence)
    for (let i = 0; i < dayNames.length; i++) {
      const pattern = new RegExp(`\\b${dayNames[i]}\\b`, 'i');
      if (pattern.test(text)) {
        const targetDay = i;
        const daysUntil = ((targetDay - currentDay + 7) % 7) || 7;
        const date = new Date(now);
        date.setDate(date.getDate() + daysUntil);
        return {
          date,
          raw: dayNames[i],
          type: 'named',
        };
      }
    }

    return null;
  }

  /**
   * Parse absolute dates (12/25/2024, Dec 25, etc.)
   */
  private parseAbsoluteDate(text: string): DateParseResult | null {
    // MM/DD/YYYY or DD/MM/YYYY
    const slashDateMatch = text.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/);
    if (slashDateMatch) {
      const date = new Date(
        parseInt(slashDateMatch[3]),
        parseInt(slashDateMatch[1]) - 1,
        parseInt(slashDateMatch[2])
      );
      return {
        date,
        raw: slashDateMatch[0],
        type: 'absolute',
      };
    }

    // YYYY-MM-DD
    const isoDateMatch = text.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
    if (isoDateMatch) {
      const date = new Date(
        parseInt(isoDateMatch[1]),
        parseInt(isoDateMatch[2]) - 1,
        parseInt(isoDateMatch[3])
      );
      return {
        date,
        raw: isoDateMatch[0],
        type: 'absolute',
      };
    }

    // Month Day, Year (e.g., December 25, 2024)
    const monthNames = [
      'january', 'february', 'march', 'april', 'may', 'june',
      'july', 'august', 'september', 'october', 'november', 'december'
    ];
    const monthAbbr = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

    for (let i = 0; i < monthNames.length; i++) {
      const pattern = new RegExp(`\\b(${monthNames[i]}|${monthAbbr[i]})\\.?\\s+(\\d{1,2}),?\\s+(\\d{4})\\b`, 'i');
      const match = text.match(pattern);
      if (match) {
        const date = new Date(parseInt(match[3]), i, parseInt(match[2]));
        return {
          date,
          raw: match[0],
          type: 'absolute',
        };
      }
    }

    // Month Day (assume current year)
    for (let i = 0; i < monthNames.length; i++) {
      const pattern = new RegExp(`\\b(${monthNames[i]}|${monthAbbr[i]})\\.?\\s+(\\d{1,2})\\b`, 'i');
      const match = text.match(pattern);
      if (match) {
        const currentYear = new Date().getFullYear();
        const date = new Date(currentYear, i, parseInt(match[2]));
        return {
          date,
          raw: match[0],
          type: 'absolute',
        };
      }
    }

    return null;
  }

  /**
   * Format date for display
   */
  formatDate(date: Date, format: 'short' | 'long' | 'relative' = 'short'): string {
    if (format === 'relative') {
      return this.formatRelativeDate(date);
    }

    if (format === 'long') {
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    }

    // Short format
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  /**
   * Format date relative to now
   */
  private formatRelativeDate(date: Date): string {
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'today';
    if (diffDays === 1) return 'tomorrow';
    if (diffDays === -1) return 'yesterday';
    if (diffDays > 1 && diffDays <= 7) return `in ${diffDays} days`;
    if (diffDays < -1 && diffDays >= -7) return `${Math.abs(diffDays)} days ago`;

    return this.formatDate(date, 'short');
  }

  /**
   * Combine date and time
   */
  combineDateTime(date: Date, timeStr: string): Date {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const combined = new Date(date);
    combined.setHours(hours, minutes, 0, 0);
    return combined;
  }
}

export const parseDate = (text: string): DateParseResult | null => {
  const parser = new DateParser();
  return parser.parseDate(text);
};

export const formatDate = (date: Date, format: 'short' | 'long' | 'relative' = 'short'): string => {
  const parser = new DateParser();
  return parser.formatDate(date, format);
};

export const combineDateTime = (date: Date, timeStr: string): Date => {
  const parser = new DateParser();
  return parser.combineDateTime(date, timeStr);
};
