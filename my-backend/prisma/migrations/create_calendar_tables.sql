-- ========================================
-- CALENDAR MODULE - DATABASE SCHEMA
-- Google Calendar-style event management
-- ========================================

-- Table: calendars
-- Stores different calendars (personal, department, project-based)
CREATE TABLE IF NOT EXISTS calendars (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    color VARCHAR(7) DEFAULT '#3B82F6', -- Hex color code
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    is_default BOOLEAN DEFAULT FALSE,
    is_public BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(user_id, name) -- Each user can have unique calendar names
);

-- Table: events
-- Stores calendar events, meetings, tasks, deadlines
CREATE TABLE IF NOT EXISTS events (
    id SERIAL PRIMARY KEY,
    calendar_id INTEGER NOT NULL REFERENCES calendars(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    location VARCHAR(255),
    
    -- Date/Time fields
    start_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP NOT NULL,
    all_day BOOLEAN DEFAULT FALSE,
    
    -- Recurrence (using RRULE format)
    is_recurring BOOLEAN DEFAULT FALSE,
    recurrence_rule TEXT, -- RRULE string (e.g., "FREQ=WEEKLY;BYDAY=MO,WE,FR")
    recurrence_exception TEXT[], -- Array of exception dates
    
    -- Event metadata
    event_type VARCHAR(50) DEFAULT 'event', -- event, meeting, task, deadline
    priority VARCHAR(20) DEFAULT 'medium', -- low, medium, high
    status VARCHAR(50) DEFAULT 'confirmed', -- confirmed, tentative, cancelled
    
    -- Organizer and participants
    organizer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Notification settings
    reminder_minutes INTEGER DEFAULT 15, -- Minutes before event to send reminder
    
    -- Tracking
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CHECK (end_date >= start_date),
    CHECK (priority IN ('low', 'medium', 'high')),
    CHECK (event_type IN ('event', 'meeting', 'task', 'deadline')),
    CHECK (status IN ('confirmed', 'tentative', 'cancelled'))
);

-- Table: event_attendees
-- Many-to-many relationship between events and users
CREATE TABLE IF NOT EXISTS event_attendees (
    id SERIAL PRIMARY KEY,
    event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    response_status VARCHAR(50) DEFAULT 'pending', -- pending, accepted, declined, tentative
    is_organizer BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(event_id, user_id),
    CHECK (response_status IN ('pending', 'accepted', 'declined', 'tentative'))
);

-- Table: reminders
-- Stores reminder/notification logs
CREATE TABLE IF NOT EXISTS reminders (
    id SERIAL PRIMARY KEY,
    event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reminder_time TIMESTAMP NOT NULL,
    is_sent BOOLEAN DEFAULT FALSE,
    sent_at TIMESTAMP,
    notification_type VARCHAR(50) DEFAULT 'email', -- email, popup, both
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CHECK (notification_type IN ('email', 'popup', 'both'))
);

-- Table: event_tasks
-- For task-type events with checklist items
CREATE TABLE IF NOT EXISTS event_tasks (
    id SERIAL PRIMARY KEY,
    event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    task_description TEXT NOT NULL,
    is_completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP,
    completed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- INDEXES FOR PERFORMANCE
-- ========================================

-- Calendar indexes
CREATE INDEX IF NOT EXISTS idx_calendars_user_id ON calendars(user_id);
CREATE INDEX IF NOT EXISTS idx_calendars_is_public ON calendars(is_public);

-- Event indexes
CREATE INDEX IF NOT EXISTS idx_events_calendar_id ON events(calendar_id);
CREATE INDEX IF NOT EXISTS idx_events_organizer_id ON events(organizer_id);
CREATE INDEX IF NOT EXISTS idx_events_start_date ON events(start_date);
CREATE INDEX IF NOT EXISTS idx_events_end_date ON events(end_date);
CREATE INDEX IF NOT EXISTS idx_events_event_type ON events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_events_date_range ON events(start_date, end_date);

-- Attendee indexes
CREATE INDEX IF NOT EXISTS idx_event_attendees_event_id ON event_attendees(event_id);
CREATE INDEX IF NOT EXISTS idx_event_attendees_user_id ON event_attendees(user_id);
CREATE INDEX IF NOT EXISTS idx_event_attendees_response ON event_attendees(response_status);

-- Reminder indexes
CREATE INDEX IF NOT EXISTS idx_reminders_event_id ON reminders(event_id);
CREATE INDEX IF NOT EXISTS idx_reminders_user_id ON reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_reminders_time ON reminders(reminder_time);
CREATE INDEX IF NOT EXISTS idx_reminders_is_sent ON reminders(is_sent);

-- Task indexes
CREATE INDEX IF NOT EXISTS idx_event_tasks_event_id ON event_tasks(event_id);
CREATE INDEX IF NOT EXISTS idx_event_tasks_completed ON event_tasks(is_completed);

-- ========================================
-- TRIGGERS FOR AUTO-UPDATE
-- ========================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers
DROP TRIGGER IF EXISTS update_calendars_updated_at ON calendars;
CREATE TRIGGER update_calendars_updated_at BEFORE UPDATE ON calendars
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_events_updated_at ON events;
CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- SAMPLE DATA
-- ========================================

-- Insert default calendar for user id 1 (if exists)
INSERT INTO calendars (name, description, color, user_id, is_default, is_public)
VALUES 
    ('My Calendar', 'Personal calendar', '#3B82F6', 1, TRUE, FALSE),
    ('Work Calendar', 'Work-related events', '#10B981', 1, FALSE, FALSE),
    ('Meetings', 'Team meetings', '#F59E0B', 1, FALSE, TRUE)
ON CONFLICT (user_id, name) DO NOTHING;

-- Insert sample events
INSERT INTO events (calendar_id, title, description, start_date, end_date, event_type, priority, organizer_id)
SELECT 1, 'Team Standup', 'Daily team sync meeting', 
     CURRENT_DATE + INTERVAL '1 day' + TIME '09:00', 
     CURRENT_DATE + INTERVAL '1 day' + TIME '09:30', 
     'meeting', 'high', 1
WHERE EXISTS (SELECT 1 FROM calendars WHERE id = 1)
ON CONFLICT DO NOTHING;

-- Comments for documentation
COMMENT ON TABLE calendars IS 'Stores user calendars with color coding for visual organization';
COMMENT ON TABLE events IS 'Central table for all calendar events, meetings, tasks, and deadlines';
COMMENT ON TABLE event_attendees IS 'Many-to-many relationship between events and participants';
COMMENT ON TABLE reminders IS 'Tracks notification/reminder delivery for events';
COMMENT ON TABLE event_tasks IS 'Checklist items for task-type events';
