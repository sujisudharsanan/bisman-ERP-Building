/**
 * Calendar Agent API Routes
 * Handles meeting creation from URLs, alarm setting, and calendar management
 */

import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import CopilateSmartAgent from '../services/copilateSmartAgent';
import PageCollector from '../services/pageCollector';
import CalendarAgent from '../services/calendarAgent';

const router = Router();

/**
 * POST /api/calendar/create-from-url
 * Fetch a page and extract data for event creation
 */
router.post('/create-from-url', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({
        success: false,
        error: 'URL is required'
      });
    }
    
    // Check RBAC
    const hasPermission = await CopilateSmartAgent.hasPermission(userId, 'create_events');
    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        error: 'You do not have permission to create events'
      });
    }
    
    // Fetch and extract page data
    console.log(`[Calendar] Fetching page: ${url}`);
    const extracted = await PageCollector.fetchAndExtractPage(url);
    
    // Save page record
    const pageId = await PageCollector.savePageRecord(userId, url, extracted);
    
    // Log audit
    await PageCollector.logPageAudit(userId, 'fetch_page', { url, pageId });
    
    // Generate smart questions
    const summary = await PageCollector.generatePageQuestions(pageId, url, extracted);
    
    res.json({
      success: true,
      replyType: 'form',
      payload: summary
    });
    
  } catch (error: any) {
    console.error('[Calendar] Error fetching page:', error);
    res.status(400).json({
      success: false,
      error: `Could not fetch or parse the page: ${error.message}`
    });
  }
});

/**
 * POST /api/calendar/create-event
 * Create a calendar event from form data
 */
router.post('/create-event', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const {
      pageId,
      title,
      date,
      time,
      duration,
      participants,
      agenda,
      location,
      timezone,
      reminder_mins
    } = req.body;
    
    if (!title || !date || !time) {
      return res.status(400).json({
        success: false,
        error: 'Title, date, and time are required'
      });
    }
    
    // Check RBAC
    const hasPermission = await CopilateSmartAgent.hasPermission(userId, 'create_events');
    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        error: 'You do not have permission to create events'
      });
    }
    
    // Parse event data
    const eventData = CalendarAgent.parseEventData({
      title,
      description: agenda,
      date,
      time,
      duration: duration ? parseInt(duration) : undefined,
      participants,
      location,
      timezone,
      reminder_mins: reminder_mins ? parseInt(reminder_mins) : undefined
    });
    
    // Create calendar event
    const eventId = await CalendarAgent.createCalendarEvent(userId, eventData, pageId);
    
    // Log audit
    await PageCollector.logPageAudit(userId, 'create_event', {
      eventId,
      title,
      startAt: eventData.startAt,
      pageId
    });
    
    console.log(`[Calendar] Created event ${eventId} for user ${userId}`);
    
    res.json({
      success: true,
      eventId,
      link: `/calendar/${eventId}`,
      message: `✅ Event "${title}" created successfully!`
    });
    
  } catch (error: any) {
    console.error('[Calendar] Error creating event:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/calendar/create-alarm
 * Set an alarm/reminder
 */
router.post('/create-alarm', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { label, date, time, repeat } = req.body;
    
    if (!label || !date || !time) {
      return res.status(400).json({
        success: false,
        error: 'Label, date, and time are required'
      });
    }
    
    // Parse date and time
    const eventData = CalendarAgent.parseEventData({
      title: label,
      date,
      time
    });
    
    // Create alarm
    const alarmId = await CalendarAgent.createAlarm(
      userId,
      label,
      eventData.startAt,
      repeat
    );
    
    // Log audit
    await PageCollector.logPageAudit(userId, 'set_alarm', {
      alarmId,
      label,
      timeAt: eventData.startAt
    });
    
    console.log(`[Calendar] Created alarm ${alarmId} for user ${userId}`);
    
    res.json({
      success: true,
      alarmId,
      message: `⏰ Alarm "${label}" set for ${eventData.startAt.toLocaleString('en-IN')}`
    });
    
  } catch (error: any) {
    console.error('[Calendar] Error creating alarm:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/calendar/events
 * Get user's upcoming events
 */
router.get('/events', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const limit = parseInt(req.query.limit as string) || 10;
    
    const events = await CalendarAgent.getUserCalendarEvents(userId, limit);
    
    res.json({
      success: true,
      data: events,
      count: events.length
    });
    
  } catch (error: any) {
    console.error('[Calendar] Error getting events:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get events'
    });
  }
});

/**
 * GET /api/calendar/alarms
 * Get user's active alarms
 */
router.get('/alarms', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    
    const alarms = await CalendarAgent.getUserAlarms(userId);
    
    res.json({
      success: true,
      data: alarms,
      count: alarms.length
    });
    
  } catch (error: any) {
    console.error('[Calendar] Error getting alarms:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get alarms'
    });
  }
});

/**
 * DELETE /api/calendar/events/:id
 * Cancel a calendar event
 */
router.delete('/events/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { id } = req.params;
    
    const cancelled = await CalendarAgent.cancelCalendarEvent(id, userId);
    
    if (!cancelled) {
      return res.status(404).json({
        success: false,
        error: 'Event not found or you do not have permission to cancel it'
      });
    }
    
    // Log audit
    await PageCollector.logPageAudit(userId, 'cancel_event', { eventId: id });
    
    res.json({
      success: true,
      message: 'Event cancelled successfully'
    });
    
  } catch (error: any) {
    console.error('[Calendar] Error cancelling event:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cancel event'
    });
  }
});

export default router;
