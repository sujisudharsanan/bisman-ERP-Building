/**
 * Calendar Agent Service
 * Handles calendar events, meetings, tasks, and alarms
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface CalendarEvent {
  title: string;
  description?: string;
  date: string; // YYYY-MM-DD or relative like "today"
  time: string; // HH:MM
  duration?: number; // minutes
  participants?: string; // comma-separated
  location?: string;
  timezone?: string;
  reminder_mins?: number;
}

interface ParsedEvent {
  title: string;
  description: string;
  startAt: Date;
  endAt: Date;
  timezone: string;
  participants: Array<{ raw: string }>;
  location: string;
  reminders: Array<{ method: string; mins: number }>;
}

/**
 * Parse relative dates (today, tomorrow, etc.)
 */
function parseRelativeDate(dateStr: string): Date {
  const lower = dateStr.toLowerCase().trim();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  switch (lower) {
    case 'today':
      return today;
    case 'tomorrow':
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      return tomorrow;
    case 'day after tomorrow':
    case 'dat':
      const dat = new Date(today);
      dat.setDate(dat.getDate() + 2);
      return dat;
    default:
      // Try to parse as YYYY-MM-DD
      const parsed = new Date(dateStr);
      if (isNaN(parsed.getTime())) {
        throw new Error(`Invalid date: ${dateStr}. Use YYYY-MM-DD, "today", or "tomorrow"`);
      }
      return parsed;
  }
}

/**
 * Parse event data and create Date objects
 */
export function parseEventData(event: CalendarEvent): ParsedEvent {
  // Parse date
  const dateObj = parseRelativeDate(event.date);
  
  // Parse time (HH:MM)
  const timeMatch = event.time.match(/^(\d{1,2}):(\d{2})$/);
  if (!timeMatch) {
    throw new Error(`Invalid time format: ${event.time}. Use HH:MM (24-hour)`);
  }
  
  const hours = parseInt(timeMatch[1]);
  const minutes = parseInt(timeMatch[2]);
  
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    throw new Error(`Invalid time: ${event.time}`);
  }
  
  // Create start datetime
  const timezone = event.timezone || 'Asia/Kolkata';
  const startAt = new Date(dateObj);
  startAt.setHours(hours, minutes, 0, 0);
  
  // Create end datetime
  const duration = event.duration || 60;
  const endAt = new Date(startAt.getTime() + duration * 60000);
  
  // Parse participants
  const participants = event.participants
    ? event.participants.split(',').map(p => ({ raw: p.trim() })).filter(p => p.raw)
    : [];
  
  // Parse reminders
  const reminderMins = event.reminder_mins || 30;
  const reminders = [{ method: 'popup', mins: reminderMins }];
  
  return {
    title: event.title,
    description: event.description || '',
    startAt,
    endAt,
    timezone,
    participants,
    location: event.location || '',
    reminders
  };
}

/**
 * Create calendar event in database
 */
export async function createCalendarEvent(
  userId: string,
  eventData: ParsedEvent,
  sourcePageId?: string
): Promise<string> {
  const result = await prisma.$queryRaw<Array<{ id: string }>>`
    INSERT INTO calendar_items (
      id, created_by, title, description, start_at, end_at, 
      timezone, participants, location, reminders, source_page_id, status
    )
    VALUES (
      gen_random_uuid(),
      ${userId}::uuid,
      ${eventData.title},
      ${eventData.description},
      ${eventData.startAt.toISOString()}::timestamptz,
      ${eventData.endAt.toISOString()}::timestamptz,
      ${eventData.timezone},
      ${JSON.stringify(eventData.participants)}::jsonb,
      ${eventData.location},
      ${JSON.stringify(eventData.reminders)}::jsonb,
      ${sourcePageId ? `${sourcePageId}::uuid` : null},
      'confirmed'
    )
    RETURNING id::text
  `;
  
  return result[0].id;
}

/**
 * Create alarm/reminder
 */
export async function createAlarm(
  userId: string,
  label: string,
  timeAt: Date,
  repeatRule?: string
): Promise<string> {
  const result = await prisma.$queryRaw<Array<{ id: string }>>`
    INSERT INTO alarms (id, user_id, label, time_at, repeat_rule, status)
    VALUES (
      gen_random_uuid(),
      ${userId}::uuid,
      ${label},
      ${timeAt.toISOString()}::timestamptz,
      ${repeatRule || null},
      'active'
    )
    RETURNING id::text
  `;
  
  return result[0].id;
}

/**
 * Get user's upcoming calendar events
 */
export async function getUserCalendarEvents(
  userId: string,
  limit: number = 10
): Promise<any[]> {
  const events = await prisma.$queryRaw<Array<any>>`
    SELECT 
      id, title, description, start_at, end_at, 
      location, participants, status, created_at
    FROM calendar_items
    WHERE created_by = ${userId}::uuid
      AND start_at >= now()
      AND status != 'cancelled'
    ORDER BY start_at ASC
    LIMIT ${limit}
  `;
  
  return events;
}

/**
 * Get user's alarms
 */
export async function getUserAlarms(userId: string): Promise<any[]> {
  const alarms = await prisma.$queryRaw<Array<any>>`
    SELECT id, label, time_at, repeat_rule, status, created_at
    FROM alarms
    WHERE user_id = ${userId}::uuid
      AND status = 'active'
      AND time_at >= now()
    ORDER BY time_at ASC
    LIMIT 20
  `;
  
  return alarms;
}

/**
 * Cancel calendar event
 */
export async function cancelCalendarEvent(
  eventId: string,
  userId: string
): Promise<boolean> {
  const result = await prisma.$queryRaw<Array<{ count: number }>>`
    UPDATE calendar_items
    SET status = 'cancelled', updated_at = now()
    WHERE id = ${eventId}::uuid
      AND created_by = ${userId}::uuid
    RETURNING 1 as count
  `;
  
  return result.length > 0;
}

/**
 * Format event for display
 */
export function formatEventForDisplay(event: any): string {
  const startDate = new Date(event.start_at);
  const endDate = new Date(event.end_at);
  
  const dateStr = startDate.toLocaleDateString('en-IN', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
  
  const timeStr = `${startDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} - ${endDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`;
  
  const participants = event.participants ? JSON.parse(event.participants) : [];
  const participantStr = participants.length > 0 
    ? `\n• Participants: ${participants.map((p: any) => p.raw).join(', ')}`
    : '';
  
  const locationStr = event.location ? `\n• Location: ${event.location}` : '';
  
  return `📅 **${event.title}**\n• When: ${dateStr}\n• Time: ${timeStr}${locationStr}${participantStr}`;
}

export default {
  parseEventData,
  createCalendarEvent,
  createAlarm,
  getUserCalendarEvents,
  getUserAlarms,
  cancelCalendarEvent,
  formatEventForDisplay
};
