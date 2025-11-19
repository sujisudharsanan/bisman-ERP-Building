/**
 * Calendar API Routes
 * Google Calendar-style event management for ERP system
 * 
 * Routes:
 * - GET    /api/calendars              - Get all calendars for current user
 * - POST   /api/calendars              - Create new calendar
 * - GET    /api/calendars/:id          - Get specific calendar
 * - PUT    /api/calendars/:id          - Update calendar
 * - DELETE /api/calendars/:id          - Delete calendar
 * - GET    /api/calendars/:id/events   - Get all events for a calendar
 * - POST   /api/calendars/:id/events   - Create event in calendar
 * - GET    /api/events                 - Get all events for current user (all calendars)
 * - GET    /api/events/:id             - Get specific event
 * - PUT    /api/events/:id             - Update event
 * - DELETE /api/events/:id             - Delete event
 * - POST   /api/events/:id/attendees   - Add attendee to event
 * - DELETE /api/events/:id/attendees/:userId - Remove attendee from event
 */

const express = require('express');
const router = express.Router();
const { Pool } = require('pg');

// Initialize database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

/**
 * Middleware: Verify JWT token and attach user to request
 * Replace with your actual auth middleware
 */
const authenticate = async (req, res, next) => {
  try {
    // Example: Extract token from Authorization header
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    // Verify token and get user (replace with your JWT logic)
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // Should contain { id, email, role, etc. }
    
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Apply authentication to all routes
router.use(authenticate);

// ========================================
// CALENDAR ROUTES
// ========================================

/**
 * GET /api/calendars
 * Get all calendars for current user
 */
router.get('/calendars', async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await pool.query(
      `SELECT id, name, description, color, is_default, is_public, created_at, updated_at
       FROM calendars
       WHERE user_id = $1
       ORDER BY is_default DESC, name ASC`,
      [userId]
    );

    res.json({
      success: true,
      calendars: result.rows
    });
  } catch (error) {
    console.error('Error fetching calendars:', error);
    res.status(500).json({ error: 'Failed to fetch calendars' });
  }
});

/**
 * POST /api/calendars
 * Create new calendar
 * Body: { name, description, color, is_public }
 */
router.post('/calendars', async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, description, color = '#3B82F6', is_public = false } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Calendar name is required' });
    }

    const result = await pool.query(
      `INSERT INTO calendars (name, description, color, user_id, is_public)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [name, description, color, userId, is_public]
    );

    res.status(201).json({
      success: true,
      calendar: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating calendar:', error);
    if (error.code === '23505') { // Unique constraint violation
      return res.status(409).json({ error: 'Calendar with this name already exists' });
    }
    res.status(500).json({ error: 'Failed to create calendar' });
  }
});

/**
 * PUT /api/calendars/:id
 * Update calendar
 */
router.put('/calendars/:id', async (req, res) => {
  try {
    const userId = req.user.id;
    const calendarId = req.params.id;
    const { name, description, color, is_public } = req.body;

    const result = await pool.query(
      `UPDATE calendars
       SET name = COALESCE($1, name),
           description = COALESCE($2, description),
           color = COALESCE($3, color),
           is_public = COALESCE($4, is_public)
       WHERE id = $5 AND user_id = $6
       RETURNING *`,
      [name, description, color, is_public, calendarId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Calendar not found' });
    }

    res.json({
      success: true,
      calendar: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating calendar:', error);
    res.status(500).json({ error: 'Failed to update calendar' });
  }
});

/**
 * DELETE /api/calendars/:id
 * Delete calendar
 */
router.delete('/calendars/:id', async (req, res) => {
  try {
    const userId = req.user.id;
    const calendarId = req.params.id;

    const result = await pool.query(
      `DELETE FROM calendars
       WHERE id = $1 AND user_id = $2
       RETURNING id`,
      [calendarId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Calendar not found' });
    }

    res.json({
      success: true,
      message: 'Calendar deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting calendar:', error);
    res.status(500).json({ error: 'Failed to delete calendar' });
  }
});

// ========================================
// EVENT ROUTES
// ========================================

/**
 * GET /api/events
 * Get all events for current user (across all calendars)
 * Query params: start, end (ISO date strings for filtering)
 */
router.get('/events', async (req, res) => {
  try {
    const userId = req.user.id;
    const { start, end } = req.query;

    let query = `
      SELECT 
        e.id,
        e.title,
        e.description,
        e.location,
        e.start_date,
        e.end_date,
        e.all_day,
        e.event_type,
        e.priority,
        e.status,
        e.is_recurring,
        e.recurrence_rule,
        e.reminder_minutes,
        c.id AS calendar_id,
        c.name AS calendar_name,
        c.color AS calendar_color,
        u.name AS organizer_name,
        (e.organizer_id = $1) AS is_organizer,
        COALESCE(ea.response_status, 'pending') AS response_status
      FROM events e
      JOIN calendars c ON e.calendar_id = c.id
      LEFT JOIN users u ON e.organizer_id = u.id
      LEFT JOIN event_attendees ea ON e.id = ea.event_id AND ea.user_id = $1
      WHERE (c.user_id = $1 OR ea.user_id = $1 OR c.is_public = TRUE)
        AND e.status != 'cancelled'
    `;

    const params = [userId];

    // Add date filtering if provided
    if (start) {
      query += ` AND e.end_date >= $${params.length + 1}`;
      params.push(start);
    }

    if (end) {
      query += ` AND e.start_date <= $${params.length + 1}`;
      params.push(end);
    }

    query += ` ORDER BY e.start_date ASC`;

    const result = await pool.query(query, params);

    // Transform to FullCalendar format
    const events = result.rows.map(row => ({
      id: row.id,
      title: row.title,
      start: row.start_date,
      end: row.end_date,
      allDay: row.all_day,
      backgroundColor: row.calendar_color,
      borderColor: row.calendar_color,
      extendedProps: {
        description: row.description,
        location: row.location,
        eventType: row.event_type,
        priority: row.priority,
        status: row.status,
        isRecurring: row.is_recurring,
        recurrenceRule: row.recurrence_rule,
        reminderMinutes: row.reminder_minutes,
        calendarId: row.calendar_id,
        calendarName: row.calendar_name,
        organizerName: row.organizer_name,
        isOrganizer: row.is_organizer,
        responseStatus: row.response_status
      }
    }));

    res.json({
      success: true,
      events
    });
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

/**
 * POST /api/calendars/:id/events
 * Create new event in a calendar
 */
router.post('/calendars/:calendarId/events', async (req, res) => {
  try {
    const userId = req.user.id;
    const calendarId = req.params.calendarId;
    const {
      title,
      description,
      location,
      start_date,
      end_date,
      all_day = false,
      event_type = 'event',
      priority = 'medium',
      reminder_minutes = 15,
      is_recurring = false,
      recurrence_rule,
      attendees = []
    } = req.body;

    if (!title || !start_date || !end_date) {
      return res.status(400).json({ error: 'Title, start_date, and end_date are required' });
    }

    // Verify calendar ownership
    const calendarCheck = await pool.query(
      'SELECT id FROM calendars WHERE id = $1 AND user_id = $2',
      [calendarId, userId]
    );

    if (calendarCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Calendar not found' });
    }

    // Create event
    const eventResult = await pool.query(
      `INSERT INTO events (
        calendar_id, title, description, location,
        start_date, end_date, all_day, event_type, priority,
        reminder_minutes, is_recurring, recurrence_rule, organizer_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING *`,
      [
        calendarId, title, description, location,
        start_date, end_date, all_day, event_type, priority,
        reminder_minutes, is_recurring, recurrence_rule, userId
      ]
    );

    const event = eventResult.rows[0];

    // Add organizer as attendee
    await pool.query(
      `INSERT INTO event_attendees (event_id, user_id, response_status, is_organizer)
       VALUES ($1, $2, 'accepted', TRUE)`,
      [event.id, userId]
    );

    // Add additional attendees
    for (const attendeeId of attendees) {
      await pool.query(
        `INSERT INTO event_attendees (event_id, user_id)
         VALUES ($1, $2)
         ON CONFLICT (event_id, user_id) DO NOTHING`,
        [event.id, attendeeId]
      );
    }

    // Create reminder
    const reminderTime = new Date(new Date(start_date).getTime() - reminder_minutes * 60000);
    await pool.query(
      `INSERT INTO reminders (event_id, user_id, reminder_time)
       VALUES ($1, $2, $3)`,
      [event.id, userId, reminderTime]
    );

    res.status(201).json({
      success: true,
      event
    });
  } catch (error) {
    console.error('Error creating event:', error);
    res.status(500).json({ error: 'Failed to create event' });
  }
});

/**
 * PUT /api/events/:id
 * Update event
 */
router.put('/events/:id', async (req, res) => {
  try {
    const userId = req.user.id;
    const eventId = req.params.id;
    const {
      title,
      description,
      location,
      start_date,
      end_date,
      all_day,
      event_type,
      priority,
      status,
      reminder_minutes
    } = req.body;

    // Verify event ownership or organizer
    const eventCheck = await pool.query(
      `SELECT e.* FROM events e
       JOIN calendars c ON e.calendar_id = c.id
       WHERE e.id = $1 AND (c.user_id = $2 OR e.organizer_id = $2)`,
      [eventId, userId]
    );

    if (eventCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found or access denied' });
    }

    const result = await pool.query(
      `UPDATE events
       SET title = COALESCE($1, title),
           description = COALESCE($2, description),
           location = COALESCE($3, location),
           start_date = COALESCE($4, start_date),
           end_date = COALESCE($5, end_date),
           all_day = COALESCE($6, all_day),
           event_type = COALESCE($7, event_type),
           priority = COALESCE($8, priority),
           status = COALESCE($9, status),
           reminder_minutes = COALESCE($10, reminder_minutes)
       WHERE id = $11
       RETURNING *`,
      [title, description, location, start_date, end_date, all_day, 
       event_type, priority, status, reminder_minutes, eventId]
    );

    res.json({
      success: true,
      event: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating event:', error);
    res.status(500).json({ error: 'Failed to update event' });
  }
});

/**
 * DELETE /api/events/:id
 * Delete event
 */
router.delete('/events/:id', async (req, res) => {
  try {
    const userId = req.user.id;
    const eventId = req.params.id;

    // Verify event ownership
    const result = await pool.query(
      `DELETE FROM events
       WHERE id = $1 AND organizer_id = $2
       RETURNING id`,
      [eventId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found or access denied' });
    }

    res.json({
      success: true,
      message: 'Event deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting event:', error);
    res.status(500).json({ error: 'Failed to delete event' });
  }
});

/**
 * POST /api/events/:id/attendees
 * Add attendee to event
 */
router.post('/events/:id/attendees', async (req, res) => {
  try {
    const eventId = req.params.id;
    const { user_id } = req.body;

    await pool.query(
      `INSERT INTO event_attendees (event_id, user_id)
       VALUES ($1, $2)
       ON CONFLICT (event_id, user_id) DO NOTHING`,
      [eventId, user_id]
    );

    res.json({
      success: true,
      message: 'Attendee added successfully'
    });
  } catch (error) {
    console.error('Error adding attendee:', error);
    res.status(500).json({ error: 'Failed to add attendee' });
  }
});

/**
 * DELETE /api/events/:id/attendees/:userId
 * Remove attendee from event
 */
router.delete('/events/:id/attendees/:userId', async (req, res) => {
  try {
    const { id: eventId, userId } = req.params;

    await pool.query(
      `DELETE FROM event_attendees
       WHERE event_id = $1 AND user_id = $2 AND is_organizer = FALSE`,
      [eventId, userId]
    );

    res.json({
      success: true,
      message: 'Attendee removed successfully'
    });
  } catch (error) {
    console.error('Error removing attendee:', error);
    res.status(500).json({ error: 'Failed to remove attendee' });
  }
});

module.exports = router;
