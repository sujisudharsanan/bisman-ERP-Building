/**
 * Entity Extraction Service
 * Extracts entities like dates, times, amounts, names, IDs from text
 */

import { parseDate, formatDate } from '../../utils/dateParser';

export interface EntityExtractionResult {
  amount?: number;
  currency?: string;
  date?: Date;
  time?: string;
  invoiceId?: string;
  userName?: string;
  location?: string;
  hubId?: number;
  vehicleId?: string;
  vendorName?: string;
  leaveType?: string;
  duration?: {
    value: number;
    unit: 'day' | 'hour' | 'week' | 'month';
  };
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  raw: {
    [key: string]: string;
  };
}

export class EntityService {
  /**
   * Extract all entities from text
   */
  extractEntities(text: string): EntityExtractionResult {
    const result: EntityExtractionResult = {
      raw: {},
    };

    // Extract amount and currency
    const amountMatch = this.extractAmount(text);
    if (amountMatch) {
      result.amount = amountMatch.amount;
      result.currency = amountMatch.currency;
      result.raw.amount = amountMatch.raw;
    }

    // Extract date
    const dateMatch = this.extractDate(text);
    if (dateMatch) {
      result.date = dateMatch.date;
      result.raw.date = dateMatch.raw;
    }

    // Extract time
    const timeMatch = this.extractTime(text);
    if (timeMatch) {
      result.time = timeMatch.time;
      result.raw.time = timeMatch.raw;
    }

    // Extract invoice ID
    const invoiceMatch = this.extractInvoiceId(text);
    if (invoiceMatch) {
      result.invoiceId = invoiceMatch.id;
      result.raw.invoiceId = invoiceMatch.raw;
    }

    // Extract user name
    const userMatch = this.extractUserName(text);
    if (userMatch) {
      result.userName = userMatch.name;
      result.raw.userName = userMatch.raw;
    }

    // Extract location/hub
    const locationMatch = this.extractLocation(text);
    if (locationMatch) {
      result.location = locationMatch.location;
      if (locationMatch.hubId) {
        result.hubId = locationMatch.hubId;
      }
      result.raw.location = locationMatch.raw;
    }

    // Extract vehicle ID
    const vehicleMatch = this.extractVehicleId(text);
    if (vehicleMatch) {
      result.vehicleId = vehicleMatch.id;
      result.raw.vehicleId = vehicleMatch.raw;
    }

    // Extract vendor name
    const vendorMatch = this.extractVendorName(text);
    if (vendorMatch) {
      result.vendorName = vendorMatch.name;
      result.raw.vendorName = vendorMatch.raw;
    }

    // Extract leave type
    const leaveMatch = this.extractLeaveType(text);
    if (leaveMatch) {
      result.leaveType = leaveMatch.type;
      result.raw.leaveType = leaveMatch.raw;
    }

    // Extract duration
    const durationMatch = this.extractDuration(text);
    if (durationMatch) {
      result.duration = durationMatch.duration;
      result.raw.duration = durationMatch.raw;
    }

    // Extract priority
    const priorityMatch = this.extractPriority(text);
    if (priorityMatch) {
      result.priority = priorityMatch.priority;
      result.raw.priority = priorityMatch.raw;
    }

    return result;
  }

  /**
   * Extract monetary amount
   */
  private extractAmount(text: string): { amount: number; currency: string; raw: string } | null {
    // Match patterns like: $100, Rs.500, ₹1000, 500 rupees, 100 dollars
    const patterns = [
      /\$\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/i,
      /₹\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/i,
      /Rs\.?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/i,
      /(\d+(?:,\d{3})*(?:\.\d{2})?)\s*(?:rupees?|rs\.?|inr)/i,
      /(\d+(?:,\d{3})*(?:\.\d{2})?)\s*(?:dollars?|usd)/i,
      /(\d+(?:,\d{3})*(?:\.\d{2})?)\s*(?:euros?|eur)/i,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        const amountStr = match[1].replace(/,/g, '');
        const amount = parseFloat(amountStr);
        
        let currency = 'INR'; // Default
        if (text.match(/\$/)) currency = 'USD';
        else if (text.match(/euro/i)) currency = 'EUR';
        else if (text.match(/₹|rupee|rs\.?|inr/i)) currency = 'INR';

        return {
          amount,
          currency,
          raw: match[0],
        };
      }
    }

    return null;
  }

  /**
   * Extract date from text
   */
  private extractDate(text: string): { date: Date; raw: string } | null {
    const result = parseDate(text);
    if (result) {
      return {
        date: result.date,
        raw: result.raw,
      };
    }
    return null;
  }

  /**
   * Extract time from text
   */
  private extractTime(text: string): { time: string; raw: string } | null {
    const patterns = [
      /\b(\d{1,2}):(\d{2})\s*(am|pm)\b/i,
      /\b(\d{1,2})\s*(am|pm)\b/i,
      /\b(\d{1,2}):(\d{2})\b/,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        let hours = parseInt(match[1]);
        const minutes = match[2] ? parseInt(match[2]) : 0;
        const meridiem = match[3]?.toLowerCase();

        if (meridiem === 'pm' && hours < 12) hours += 12;
        if (meridiem === 'am' && hours === 12) hours = 0;

        const time = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
        
        return {
          time,
          raw: match[0],
        };
      }
    }

    return null;
  }

  /**
   * Extract invoice/payment request ID
   */
  private extractInvoiceId(text: string): { id: string; raw: string } | null {
    const patterns = [
      /\b(PR|INV|BILL|PAY)-(\d+)\b/i,
      /\b(invoice|bill|payment)\s*#?\s*(\d+)\b/i,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        const id = match[1] && match[2] ? `${match[1].toUpperCase()}-${match[2]}` : match[0];
        return {
          id,
          raw: match[0],
        };
      }
    }

    return null;
  }

  /**
   * Extract user/employee name
   */
  private extractUserName(text: string): { name: string; raw: string } | null {
    const patterns = [
      /\b(?:for|to|with|by|from)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b/,
      /\b(?:user|employee|staff|person)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b/i,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return {
          name: match[1].trim(),
          raw: match[0],
        };
      }
    }

    return null;
  }

  /**
   * Extract location/hub information
   */
  private extractLocation(text: string): { location: string; hubId?: number; raw: string } | null {
    const patterns = [
      /\bhub\s*#?\s*(\d+)\b/i,
      /\b(warehouse|branch|location|hub)\s+([A-Za-z\s]+)\b/i,
      /\bat\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b/,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        if (match[1] && /^\d+$/.test(match[1])) {
          return {
            location: `Hub ${match[1]}`,
            hubId: parseInt(match[1]),
            raw: match[0],
          };
        } else {
          return {
            location: match[2] || match[1],
            raw: match[0],
          };
        }
      }
    }

    return null;
  }

  /**
   * Extract vehicle ID
   */
  private extractVehicleId(text: string): { id: string; raw: string } | null {
    const patterns = [
      /\b([A-Z]{2}\s?\d{2}\s?[A-Z]{1,2}\s?\d{4})\b/, // Indian vehicle number
      /\bvehicle\s*#?\s*([A-Z0-9-]+)\b/i,
      /\bcar\s*#?\s*([A-Z0-9-]+)\b/i,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return {
          id: match[1].replace(/\s/g, '').toUpperCase(),
          raw: match[0],
        };
      }
    }

    return null;
  }

  /**
   * Extract vendor/supplier name
   */
  private extractVendorName(text: string): { name: string; raw: string } | null {
    const patterns = [
      /\b(?:vendor|supplier)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b/i,
      /\bto\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:vendor|supplier)\b/i,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return {
          name: match[1].trim(),
          raw: match[0],
        };
      }
    }

    return null;
  }

  /**
   * Extract leave type
   */
  private extractLeaveType(text: string): { type: string; raw: string } | null {
    const patterns = [
      /\b(sick|casual|earned|vacation|emergency|maternity|paternity)\s+leave\b/i,
      /\bleave\s+type\s*:?\s*([a-z]+)\b/i,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return {
          type: match[1].toLowerCase(),
          raw: match[0],
        };
      }
    }

    return null;
  }

  /**
   * Extract duration
   */
  private extractDuration(text: string): {
    duration: { value: number; unit: 'day' | 'hour' | 'week' | 'month' };
    raw: string;
  } | null {
    const patterns = [
      /\b(\d+)\s*(days?|hours?|weeks?|months?)\b/i,
      /\bfor\s+(\d+)\s*(days?|hours?|weeks?|months?)\b/i,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        const value = parseInt(match[1]);
        let unit: 'day' | 'hour' | 'week' | 'month' = 'day';
        
        const unitStr = match[2].toLowerCase();
        if (unitStr.startsWith('hour')) unit = 'hour';
        else if (unitStr.startsWith('week')) unit = 'week';
        else if (unitStr.startsWith('month')) unit = 'month';

        return {
          duration: { value, unit },
          raw: match[0],
        };
      }
    }

    return null;
  }

  /**
   * Extract priority level
   */
  private extractPriority(text: string): {
    priority: 'low' | 'medium' | 'high' | 'urgent';
    raw: string;
  } | null {
    const patterns = [
      /\b(low|medium|high|urgent)\s+priority\b/i,
      /\bpriority\s*:?\s*(low|medium|high|urgent)\b/i,
      /\b(urgent|asap|immediately|critical)\b/i,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        let priority: 'low' | 'medium' | 'high' | 'urgent' = 'medium';
        const str = match[1].toLowerCase();
        
        if (str === 'low') priority = 'low';
        else if (str === 'medium') priority = 'medium';
        else if (str === 'high') priority = 'high';
        else if (['urgent', 'asap', 'immediately', 'critical'].includes(str)) priority = 'urgent';

        return {
          priority,
          raw: match[0],
        };
      }
    }

    return null;
  }

  /**
   * Extract description/action from task creation
   */
  extractTaskDescription(text: string): string {
    // Remove common trigger words and extract the core action
    const cleaned = text
      .replace(/^(create|add|make|schedule|set)\s+(a\s+)?(task|reminder|todo)\s+(to|for|about)\s+/i, '')
      .replace(/^(remind|tell)\s+me\s+(to|about)\s+/i, '')
      .replace(/\s+(tomorrow|today|next\s+\w+|on\s+\w+|at\s+\d+)/gi, '')
      .trim();

    return cleaned || text;
  }
}

export const entityService = new EntityService();
