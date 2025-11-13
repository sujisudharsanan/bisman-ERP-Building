# 📅 Calendar Agent - Complete Implementation Guide

## ✅ What Was Implemented

Your Copilate Smart Chat Agent now has **Page-Collector & Calendar Agent** capabilities:

### 1. **Database Schema** ✅
Location: `/my-backend/prisma/migrations/add_calendar_agent.sql`

**New Tables:**
- `pages` - Stores fetched web pages with extracted data
- `calendar_items` - Calendar events, meetings, and tasks
- `alarms` - User alarms and reminders
- `page_audit` - Audit log for all calendar operations

### 2. **Page Collector Service** ✅
Location: `/my-backend/src/services/pageCollector.ts`

**Features:**
- Fetches web pages with 10s timeout
- Extracts: title, description, H1/H2, emails, phones
- Parses JSON-LD structured data (schema.org)
- Generates smart questions for missing event fields
- Saves to database with audit logging

### 3. **Calendar Agent Service** ✅
Location: `/my-backend/src/services/calendarAgent.ts`

**Features:**
- Parses relative dates ("today", "tomorrow", "YYYY-MM-DD")
- Creates calendar events with reminders
- Sets alarms with repeat rules
- Manages user's calendar (list, cancel events)
- Formats events for display

### 4. **API Routes** ✅
Location: `/my-backend/src/routes/calendar.ts`

**Endpoints:**
- `POST /api/calendar/create-from-url` - Fetch page and extract data
- `POST /api/calendar/create-event` - Create calendar event
- `POST /api/calendar/create-alarm` - Set alarm/reminder
- `GET /api/calendar/events` - Get user's upcoming events
- `GET /api/calendar/alarms` - Get user's alarms
- `DELETE /api/calendar/events/:id` - Cancel event

---

## 🚀 How to Deploy

### Step 1: Run Database Migration

```bash
cd "/Users/abhi/Desktop/BISMAN ERP/my-backend"

# Run the migration
psql postgresql://postgres@localhost:5432/BISMAN -f prisma/migrations/add_calendar_agent.sql
```

**Expected output:**
```
CREATE TABLE
CREATE TABLE
CREATE TABLE
CREATE TABLE
CREATE INDEX
CREATE INDEX
...
```

### Step 2: Install Dependencies

```bash
cd "/Users/abhi/Desktop/BISMAN ERP/my-backend"

# Install cheerio for HTML parsing
npm install cheerio @types/cheerio

# node-fetch should already be installed
```

### Step 3: Register Routes in app.js

Add this code to `/my-backend/app.js` (find where other routes are registered):

```javascript
// Calendar Agent routes
const calendarRoutes = require('./dist/routes/calendar').default;
app.use('/api/calendar', calendarRoutes);
```

### Step 4: Build and Restart

```bash
cd "/Users/abhi/Desktop/BISMAN ERP/my-backend"

# Build TypeScript
npm run build

# Restart backend (nodemon will auto-restart if watching)
# Or manually restart your server
```

---

## 📋 Usage Examples

### Example 1: Create Meeting from URL

**User:** "Create a meeting from https://example.com/meeting-agenda"

**Bot Flow:**
1. Acknowledges: "Thanks — I'll read the page. One moment."
2. Fetches page and extracts data
3. Replies with summary:
```
I found this page: https://example.com/meeting-agenda

📄 Title: Q4 Planning Meeting
📝 Description: Quarterly business review and planning
📧 Contacts: john@example.com, sarah@example.com

Suggested event title: "Q4 Planning Meeting"

Ready to schedule? Please provide:
1) Event title? (or type 'use default')
2) Date (YYYY-MM-DD or "today"/"tomorrow")
3) Time (HH:MM in 24-hour format)
4) Duration (minutes, default: 60)
5) Participants (comma-separated)
6) Agenda (one-line)
```

**User provides details:**
```
1) Q4 Planning Meeting
2) tomorrow
3) 14:30
4) 90
5) john@example.com, sarah@example.com
6) Review Q3 results and plan Q4 objectives
```

**Bot confirms:**
```
Confirm create event "Q4 Planning Meeting" on 2025-11-13 14:30 IST? (yes/no)
```

**User:** "yes"

**Bot creates event:**
```
✅ Event "Q4 Planning Meeting" created successfully!

📅 When: Wed, Nov 13, 2025
⏰ Time: 14:30 - 16:00
📍 Location: (not specified)
👥 Participants: john@example.com, sarah@example.com
🔔 Reminder: 30 minutes before

View event: /calendar/abc-123-uuid
```

### Example 2: Set Alarm

**User:** "Set an alarm for tomorrow at 9:00 AM labeled Daily Standup"

**Bot parses and creates:**
```
⏰ Alarm "Daily Standup" set for Nov 13, 2025 09:00 IST
```

### Example 3: List Upcoming Events

**User:** "Show my calendar" or "What meetings do I have?"

**Bot replies:**
```
📅 Your Upcoming Events:

1. Daily Standup
   • When: Wed, Nov 13, 2025
   • Time: 09:00 - 09:15
   
2. Q4 Planning Meeting
   • When: Wed, Nov 13, 2025
   • Time: 14:30 - 16:00
   • Location: Conference Room A
   • Participants: john@example.com, sarah@example.com

3. Client Review
   • When: Thu, Nov 14, 2025
   • Time: 11:00 - 12:00
```

---

## 🎯 System Prompt for Calendar Agent

Add this to your Copilate Smart Agent's system prompt:

```
SYSTEM PROMPT — "Page-Collector & Calendar Agent"

You are Copilate Calendar Agent. When a user asks to 'set an alarm' / 'schedule a meeting' / 'create task' / 'create meeting from URL', do the following:

1. RBAC: Always verify user role/permissions before reading or writing user-specific data or creating calendar items.

2. Acknowledge & fetch: Acknowledge receipt. If user provided a URL, fetch the page (server-side). If fetch fails, reply: "I can't access that page — please check the URL or permissions."

3. Extract: Pull title, meta-description, H1/H2, contact info (emails/phones), and structured data (schema.org) if present.

4. Summarize & ask: Show a short summary with the original page link and ask 3–6 targeted questions to gather missing fields required for scheduling (title, date/time, duration, participants, agenda, location, reminders).

5. Minimal interaction: Present choices as labeled options (A/B/1/2) or an interactive form. Accept single-token replies (A/B) or structured JSON from UI.

6. Confirmation for state change: Before creating a calendar event or alarm, ask for explicit confirmation: "Confirm create event — [title] on [date/time]? (yes/no)".

7. Create & log: On confirmation, create the calendar/task and return a link to the calendar item. Log all steps (raw page, extracted fields, user replies, created event id) in audit store.

8. Privacy: Do not expose PII unless user's role permits it.

9. Failure handling: If page contains ambiguous or missing date/time, ask explicit question rather than guessing.

SUPPORTED DATE FORMATS:
- "today" - Today's date
- "tomorrow" - Tomorrow's date
- "YYYY-MM-DD" - Specific date (e.g., "2025-11-13")

TIME FORMAT:
- HH:MM in 24-hour format (e.g., "14:30" for 2:30 PM)

QUICK RESPONSES:
• "Set alarm for [label] at [time]" → Create alarm
• "Create meeting from [URL]" → Fetch page and create event
• "Show my calendar" → List upcoming events
• "Cancel event [id]" → Cancel event
```

---

## 🔧 API Reference

### 1. Create Event from URL

**Endpoint:** `POST /api/calendar/create-from-url`

**Request:**
```json
{
  "url": "https://example.com/meeting-page"
}
```

**Response:**
```json
{
  "success": true,
  "replyType": "form",
  "payload": {
    "pageId": "uuid",
    "url": "https://example.com/meeting-page",
    "summary": {
      "title": "Page Title",
      "description": "Page description",
      "h1": "Main heading",
      "contacts": ["email1@example.com", "email2@example.com"]
    },
    "questions": [
      {
        "key": "title",
        "prompt": "Event title (suggested: \"Page Title\")",
        "required": true,
        "default": "Page Title"
      },
      ...
    ]
  }
}
```

### 2. Create Calendar Event

**Endpoint:** `POST /api/calendar/create-event`

**Request:**
```json
{
  "pageId": "uuid-or-null",
  "title": "Q4 Planning Meeting",
  "date": "tomorrow",
  "time": "14:30",
  "duration": 90,
  "participants": "john@example.com, sarah@example.com",
  "agenda": "Review Q3 and plan Q4",
  "location": "Conference Room A",
  "timezone": "Asia/Kolkata",
  "reminder_mins": 30
}
```

**Response:**
```json
{
  "success": true,
  "eventId": "uuid",
  "link": "/calendar/uuid",
  "message": "✅ Event \"Q4 Planning Meeting\" created successfully!"
}
```

### 3. Set Alarm

**Endpoint:** `POST /api/calendar/create-alarm`

**Request:**
```json
{
  "label": "Daily Standup",
  "date": "tomorrow",
  "time": "09:00",
  "repeat": null
}
```

**Response:**
```json
{
  "success": true,
  "alarmId": "uuid",
  "message": "⏰ Alarm \"Daily Standup\" set for Nov 13, 2025 09:00 IST"
}
```

### 4. Get Upcoming Events

**Endpoint:** `GET /api/calendar/events?limit=10`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "title": "Q4 Planning Meeting",
      "description": "Review Q3 and plan Q4",
      "start_at": "2025-11-13T14:30:00+05:30",
      "end_at": "2025-11-13T16:00:00+05:30",
      "location": "Conference Room A",
      "participants": [{"raw": "john@example.com"}],
      "status": "confirmed"
    }
  ],
  "count": 1
}
```

### 5. Get Alarms

**Endpoint:** `GET /api/calendar/alarms`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "label": "Daily Standup",
      "time_at": "2025-11-13T09:00:00+05:30",
      "repeat_rule": null,
      "status": "active"
    }
  ],
  "count": 1
}
```

### 6. Cancel Event

**Endpoint:** `DELETE /api/calendar/events/:id`

**Response:**
```json
{
  "success": true,
  "message": "Event cancelled successfully"
}
```

---

## 🔐 RBAC Integration

The Calendar Agent respects your existing RBAC system:

**Required Permission:** `create_events`

**Check in Code:**
```typescript
const hasPermission = await CopilateSmartAgent.hasPermission(userId, 'create_events');
if (!hasPermission) {
  return res.status(403).json({
    success: false,
    error: 'You do not have permission to create events'
  });
}
```

**Add Permission to Roles:**
```sql
INSERT INTO permissions (name, description)
VALUES ('create_events', 'Can create calendar events and alarms');

-- Grant to roles
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name IN ('super-admin', 'admin', 'manager')
  AND p.name = 'create_events';
```

---

## 📊 Database Schema Details

### Table: `pages`
```sql
id            UUID PRIMARY KEY
url           TEXT NOT NULL
title         TEXT
description   TEXT
h1            TEXT
h2            TEXT
contacts      JSONB -- {emails: [], phones: []}
structured    JSONB -- schema.org JSON-LD
raw_html      TEXT
fetched_by    UUID REFERENCES users(id)
fetched_at    TIMESTAMP
```

### Table: `calendar_items`
```sql
id              UUID PRIMARY KEY
created_by      UUID REFERENCES users(id)
title           TEXT NOT NULL
description     TEXT
start_at        TIMESTAMP WITH TIME ZONE
end_at          TIMESTAMP WITH TIME ZONE
timezone        TEXT DEFAULT 'Asia/Kolkata'
participants    JSONB -- [{user_id, name, email}]
location        TEXT
reminders       JSONB -- [{method:"popup", mins:30}]
source_page_id  UUID REFERENCES pages(id)
external_id     TEXT -- Google/Outlook event ID
status          TEXT DEFAULT 'pending'
created_at      TIMESTAMP
updated_at      TIMESTAMP
```

### Table: `alarms`
```sql
id           UUID PRIMARY KEY
user_id      UUID REFERENCES users(id)
label        TEXT
time_at      TIMESTAMP WITH TIME ZONE
repeat_rule  TEXT -- RRULE format
status       TEXT DEFAULT 'active'
created_at   TIMESTAMP
```

---

## 🎨 Frontend Integration (Optional)

### Chat UI Updates

**1. Detect Calendar Intents:**
```typescript
if (message.toLowerCase().includes('create meeting from')) {
  // Extract URL
  const urlMatch = message.match(/https?:\/\/[^\s]+/);
  if (urlMatch) {
    await fetch('/api/calendar/create-from-url', {
      method: 'POST',
      body: JSON.stringify({ url: urlMatch[0] })
    });
  }
}
```

**2. Render Form from Bot Response:**
```typescript
if (botReply.replyType === 'form') {
  // Render interactive form with questions
  renderCalendarForm(botReply.payload.questions);
}
```

**3. Submit Form Data:**
```typescript
async function submitCalendarEvent(formData) {
  await fetch('/api/calendar/create-event', {
    method: 'POST',
    body: JSON.stringify(formData)
  });
}
```

---

## 🧪 Testing

### Test 1: Create Event from URL
```bash
curl -X POST http://localhost:4000/api/calendar/create-from-url \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"url": "https://www.wikipedia.org"}'
```

### Test 2: Create Event Manually
```bash
curl -X POST http://localhost:4000/api/calendar/create-event \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "title": "Team Meeting",
    "date": "tomorrow",
    "time": "14:00",
    "duration": 60,
    "participants": "test@example.com",
    "agenda": "Weekly sync"
  }'
```

### Test 3: Set Alarm
```bash
curl -X POST http://localhost:4000/api/calendar/create-alarm \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "label": "Standup",
    "date": "tomorrow",
    "time": "09:00"
  }'
```

### Test 4: List Events
```bash
curl http://localhost:4000/api/calendar/events \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 🚀 Next Steps

### 1. **Add to Copilate Agent**

Update `/my-backend/src/services/copilateSmartAgent.ts` to recognize calendar intents:

```typescript
const builtInIntents = [
  {
    intent: 'create_meeting_from_url',
    keywords: ['create meeting from', 'schedule from url', 'meeting from link'],
    priority: 15
  },
  {
    intent: 'set_alarm',
    keywords: ['set alarm', 'remind me', 'create reminder'],
    priority: 12
  },
  {
    intent: 'show_calendar',
    keywords: ['show calendar', 'my events', 'upcoming meetings', 'what meetings'],
    priority: 10
  },
  // ... existing intents
];
```

### 2. **Schedule Reminders**

Install job scheduler:
```bash
npm install node-cron
```

Create reminder service:
```typescript
// /my-backend/src/services/reminderScheduler.ts
import cron from 'node-cron';

// Check for upcoming reminders every minute
cron.schedule('* * * * *', async () => {
  // Query calendar_items where start_at is within reminder window
  // Send notifications via Mattermost/email/SMS
});
```

### 3. **External Calendar Integration**

Add Google Calendar OAuth:
```bash
npm install googleapis
```

Sync events to Google Calendar when created.

---

## ✅ **Status: READY TO DEPLOY**

**Files Created:**
- ✅ Database schema: `add_calendar_agent.sql`
- ✅ Page collector service: `pageCollector.ts`
- ✅ Calendar agent service: `calendarAgent.ts`
- ✅ API routes: `calendar.ts`
- ✅ Documentation: This file

**Next Actions:**
1. Run database migration
2. Install cheerio: `npm install cheerio`
3. Register routes in app.js
4. Build and restart backend
5. Test with curl or Postman

**Created**: November 12, 2025, 7:30 PM  
**Status**: 🟢 Ready for deployment
