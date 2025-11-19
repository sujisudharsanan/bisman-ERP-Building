-- Page-Collector & Calendar Agent Database Schema
-- Run this to add calendar and page collection capabilities

-- Page scraping & extracted data
CREATE TABLE IF NOT EXISTS pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url TEXT NOT NULL,
  title TEXT,
  description TEXT,
  h1 TEXT,
  h2 TEXT,
  contacts JSONB,       -- [{type:"email", value:"..."}]
  structured JSONB,     -- schema.org or other JSON-LD
  raw_html TEXT,
  fetched_by INTEGER REFERENCES users(id),
  fetched_at TIMESTAMP DEFAULT now()
);

-- Calendar items / tasks
CREATE TABLE IF NOT EXISTS calendar_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by INTEGER REFERENCES users(id),
  title TEXT NOT NULL,
  description TEXT,
  start_at TIMESTAMP WITH TIME ZONE,
  end_at TIMESTAMP WITH TIME ZONE,
  timezone TEXT DEFAULT 'Asia/Kolkata',
  participants JSONB,   -- [{user_id, name, email}]
  location TEXT,
  reminders JSONB,      -- [{method:"popup", mins:30}]
  source_page_id UUID REFERENCES pages(id),
  external_id TEXT,     -- optional (Google/Outlook event id)
  status TEXT DEFAULT 'pending', -- pending, confirmed, cancelled
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Alarms (simple one-off)
CREATE TABLE IF NOT EXISTS alarms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id INTEGER REFERENCES users(id),
  label TEXT,
  time_at TIMESTAMP WITH TIME ZONE,
  repeat_rule TEXT,     -- e.g. "RRULE:FREQ=DAILY;COUNT=5"
  status TEXT DEFAULT 'active', -- active, triggered, cancelled
  created_at TIMESTAMP DEFAULT now()
);

-- Audit log for page collection
CREATE TABLE IF NOT EXISTS page_audit (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  action TEXT, -- fetch_page, create_event, set_alarm
  meta JSONB,
  created_at TIMESTAMP DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_calendar_items_user ON calendar_items(created_by);
CREATE INDEX IF NOT EXISTS idx_calendar_items_start ON calendar_items(start_at);
CREATE INDEX IF NOT EXISTS idx_alarms_user ON alarms(user_id);
CREATE INDEX IF NOT EXISTS idx_alarms_time ON alarms(time_at);
CREATE INDEX IF NOT EXISTS idx_pages_url ON pages(url);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_calendar_items_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calendar_items_updated
BEFORE UPDATE ON calendar_items
FOR EACH ROW
EXECUTE FUNCTION update_calendar_items_timestamp();

COMMENT ON TABLE pages IS 'Stores fetched web pages for meeting/event creation';
COMMENT ON TABLE calendar_items IS 'Calendar events, meetings, and tasks';
COMMENT ON TABLE alarms IS 'User alarms and reminders';
COMMENT ON TABLE page_audit IS 'Audit log for page fetching and calendar operations';
