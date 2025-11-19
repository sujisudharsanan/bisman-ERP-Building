# Help & Support Module - Updated Specifications

## 🎯 Overview

The Help & Support module has been updated to match your exact ERP requirements with custom categories, modules, and TCK-#### ticket format.

---

## ✅ What Was Updated

### 1. Ticket Categories (9 Categories)
Updated from generic categories to ERP-specific ones:

| Category Value | Label | Description |
|----------------|-------|-------------|
| `login_access` | Login / Access issue | Issues with login or accessing the system |
| `data_mismatch` | Data mismatch | Incorrect or inconsistent data |
| `payment_billing` | Payment / Billing | Payment processing or billing issues |
| `approvals_workflow` | Approvals & Workflow | Issues with approval processes |
| `mattermost_chatbot` | Mattermost / Chat bot | Chat or bot related issues |
| `calendar_scheduling` | Calendar & Scheduling | Calendar or scheduling problems |
| `erp_performance` | ERP performance / lag | System performance or slowness |
| `request_feature` | Request new feature | Feature requests and enhancements |
| `others` | Others | Other types of support requests |

### 2. Module / Area Affected (8 Modules)
Updated to match your ERP modules:

| Module Value | Label |
|--------------|-------|
| `finance` | Finance |
| `hr` | HR |
| `logistics_hub` | Logistics / Hub operations |
| `inventory` | Inventory |
| `vendor_management` | Vendor management |
| `reporting` | Reporting |
| `user_settings` | User settings |
| `chat_ai` | Chat / AI |

### 3. Ticket Number Format
Changed from **TKT-000001** (6 digits) to **TCK-0001** (4 digits)

Examples:
- `TCK-0001`
- `TCK-0002`
- `TCK-2031`
- `TCK-1982`

### 4. Ticket Statuses
Updated to match your workflow:

| Old Status | New Status | Badge Color |
|------------|------------|-------------|
| waiting_response | **waiting_user** | Orange |
| (all others remain same) |

Full status list:
- **Open** - Blue
- **In Progress** - Yellow
- **Waiting for User** - Orange (updated)
- **Resolved** - Green
- **Closed** - Gray

### 5. System Information Auto-Collection
Enhanced to include:
- Browser (Chrome, Firefox, Safari, Edge)
- Device (Desktop, Mobile/Tablet)
- OS (Windows, macOS, Linux, Android, iOS)
- ERP Version (2.0.1)
- **User ID** (auto-captured)
- **Hub ID** (auto-captured for hub/site information)
- **Timestamp** (ISO format)

### 6. Database Schema Updates

#### support_tickets Table
```sql
CREATE TABLE IF NOT EXISTS support_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_number VARCHAR(20) UNIQUE NOT NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(50) NOT NULL CHECK (category IN 
        ('login_access', 'data_mismatch', 'payment_billing', 
         'approvals_workflow', 'mattermost_chatbot', 'calendar_scheduling', 
         'erp_performance', 'request_feature', 'others')),
    module VARCHAR(100) NOT NULL,
    priority VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (priority IN 
        ('low', 'medium', 'high', 'critical')),
    status VARCHAR(30) NOT NULL DEFAULT 'open' CHECK (status IN 
        ('open', 'in_progress', 'waiting_user', 'resolved', 'closed')),
    
    -- User information
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
    hub_id UUID, -- Hub/site information (NEW)
    
    -- System information (stored as JSONB for flexibility)
    system_info JSONB,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP WITH TIME ZONE,
    closed_at TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    tags TEXT[],
    internal_notes TEXT,
    satisfaction_rating INTEGER CHECK (satisfaction_rating >= 1 AND satisfaction_rating <= 5),
    
    CONSTRAINT valid_ticket_number CHECK (ticket_number ~ '^TCK-[0-9]{4}$')
);
```

#### Ticket Number Generation Function
```sql
CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS TEXT AS $$
DECLARE
    next_num INTEGER;
    ticket_num TEXT;
BEGIN
    next_num := nextval('ticket_number_seq');
    ticket_num := 'TCK-' || LPAD(next_num::TEXT, 4, '0');
    RETURN ticket_num;
END;
$$ LANGUAGE plpgsql;
```

---

## 📋 Complete UI Flow

### 1. User Settings → Help & Support Tab

**Location**: User Settings Page → "Help & Support" tab (3rd tab)

**Content**:
- Hero section with "Need Help?" message
- Primary CTA: "Go to Help & Support Center" button
- Quick Links:
  - Create Ticket card
  - My Tickets card

### 2. Help & Support Center Page

**Views**:
1. **My Tickets List** (default)
2. **Create New Ticket**
3. **Ticket Detail**

---

## 🎨 Create Ticket Form

### Form Fields:

```
┌─────────────────────────────────────────────────────────────┐
│  Create New Support Ticket                                   │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Issue Category *                                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Login / Access issue                              ▼ │   │
│  └──────────────────────────────────────────────────────┘   │
│  Options:                                                     │
│  • Login / Access issue                                       │
│  • Data mismatch                                              │
│  • Payment / Billing                                          │
│  • Approvals & Workflow                                       │
│  • Mattermost / Chat bot                                      │
│  • Calendar & Scheduling                                      │
│  • ERP performance / lag                                      │
│  • Request new feature                                        │
│  • Others                                                     │
│                                                               │
│  Module / Area Affected *                                     │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Finance                                           ▼ │   │
│  └──────────────────────────────────────────────────────┘   │
│  Options:                                                     │
│  • Finance                                                    │
│  • HR                                                         │
│  • Logistics / Hub operations                                │
│  • Inventory                                                  │
│  • Vendor management                                          │
│  • Reporting                                                  │
│  • User settings                                              │
│  • Chat / AI                                                  │
│                                                               │
│  Title of Issue *                                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Unable to approve invoice in workflow                │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
│  Description *                                                │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ When I try to approve the invoice #INV-2025-001,     │   │
│  │ the system shows an error message "Permission        │   │
│  │ denied". I am logged in as Finance Manager...        │   │
│  │                                                       │   │
│  └──────────────────────────────────────────────────────┘   │
│  (Minimum 20 characters)                                      │
│                                                               │
│  Priority                                                     │
│  ┌──────┬────────┬──────┬──────────┐                        │
│  │ Low  │ Medium │ High │ Critical │                        │
│  └──────┴────────┴──────┴──────────┘                        │
│  (Medium selected by default)                                 │
│                                                               │
│  Attachments (Optional)                                       │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              📎                                       │   │
│  │   Click to upload or drag and drop files             │   │
│  │   Screenshots, Excel, PDF, Error logs                │   │
│  │   Max 10MB per file, up to 5 files                   │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
│  ▼ Auto-collected System Information                         │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Browser: Chrome | Device: Desktop | OS: macOS        │   │
│  │ ERP Version: 2.0.1 | User ID: user-uuid-here         │   │
│  │ Hub: Mumbai Central | Time: 2025-11-13 20:05:00      │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
│                                   [Cancel]  [📤 Submit]      │
└─────────────────────────────────────────────────────────────┘
```

---

## 📊 My Tickets Table

```
┌────────────┬─────────────────────────┬──────────────────┬──────────────┬──────────────┬────────┐
│ Ticket ID  │ Title                   │ Category         │ Status       │ Last Updated │ Action │
├────────────┼─────────────────────────┼──────────────────┼──────────────┼──────────────┼────────┤
│ 🟡 TCK-2031│ Unable to approve       │ Approvals &      │ 🟡 In        │ 10 min ago   │ View   │
│            │ invoice                 │ Workflow         │ Progress     │              │        │
├────────────┼─────────────────────────┼──────────────────┼──────────────┼──────────────┼────────┤
│ 🟢 TCK-1982│ Chat bot repeating      │ Mattermost /     │ 🟢 Resolved  │ Yesterday    │ View   │
│            │ replies                 │ Chat bot         │              │              │        │
├────────────┼─────────────────────────┼──────────────────┼──────────────┼──────────────┼────────┤
│ 🔴 TCK-1955│ Payment gateway timeout │ Payment /        │ 🔵 Open      │ 2 hours ago  │ View   │
│            │                         │ Billing          │              │              │        │
└────────────┴─────────────────────────┴──────────────────┴──────────────┴──────────────┴────────┘
```

### Filters Available:
- **Search**: By ticket ID, title, description
- **Status**: All Status, Open, In Progress, Waiting for User, Resolved, Closed
- **Module**: All Modules, Finance, HR, Logistics/Hub, etc.

---

## 🎫 Ticket Detail View

```
┌─────────────────────────────────────────────────────────────────────┐
│  ← Back to Tickets                                                   │
├─────────────────────────────────────────────────────────────────────┤
│  Ticket #TCK-2031  🟡 In Progress  🔴 High                          │
│  Unable to approve invoice in workflow                               │
│                                                                       │
│  Category: Approvals & Workflow  │  Module: Finance                 │
│  Created: Nov 13, 2025, 18:30    │  Updated: Nov 13, 2025, 20:00   │
│  Hub: Mumbai Central             │  User: John Doe (Finance Mgr)   │
│                                                                       │
│  When I try to approve the invoice #INV-2025-001, the system        │
│  shows an error message "Permission denied". I am logged in as      │
│  Finance Manager and should have approval rights...                 │
│                                                                       │
│  📎 Attachments                                                      │
│  ┌────────────────────────────────────────────┐                     │
│  │ 📄 error-screenshot.png (245 KB) [⬇]      │                     │
│  │ 📄 invoice-details.xlsx (128 KB)  [⬇]     │                     │
│  └────────────────────────────────────────────┘                     │
│                                                                       │
│  ℹ️ System Information                                              │
│  Browser: Chrome | Device: Desktop | OS: Windows 11                 │
│  ERP: 2.0.1 | User: usr_123456 | Hub: hub_mumbai                   │
│  Time: 2025-11-13T18:30:15.000Z                                     │
├─────────────────────────────────────────────────────────────────────┤
│  💬 Conversation                                                     │
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ 👤 John Doe (You) · Finance Manager      Nov 13, 18:35       │   │
│  │ ─────────────────────────────────────────────────────────────│   │
│  │ I've tried logging out and back in, but the issue persists. │   │
│  │ This is blocking my work as I need to approve 15 invoices.  │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ 👤 Support Team · Tech Support           Nov 13, 19:00       │   │
│  │ ─────────────────────────────────────────────────────────────│   │
│  │ Thank you for reporting this. I've checked your permissions  │   │
│  │ and found an issue with the workflow configuration. The tech │   │
│  │ team is working on it. ETA: 30 minutes.                      │   │
│  │                                                               │   │
│  │ 📄 permission-log.pdf (85 KB)               [⬇ Download]     │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                       │
│  Add Comment                                                         │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ Type your message here...                                     │   │
│  │                                                                │   │
│  └──────────────────────────────────────────────────────────────┘   │
│  [📎 Attach Files]                            [📤 Post Comment]     │
├─────────────────────────────────────────────────────────────────────┤
│  📊 Activity Timeline                                                │
│                                                                       │
│  ⚡ Support Team changed status: "Open" → "In Progress"             │
│     Nov 13, 2025 at 19:05                                           │
│                                                                       │
│  ⚡ Support Team assigned ticket to Tech Team                        │
│     Nov 13, 2025 at 19:00                                           │
│                                                                       │
│  ⚡ John Doe created this ticket                                    │
│     Nov 13, 2025 at 18:30                                           │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Ticket Workflow

### When User Submits Ticket:

1. **Generate Ticket ID**
   ```
   TCK-0001, TCK-0002, etc.
   ```

2. **Save to Database**
   - Insert into `support_tickets` table
   - Store system_info as JSONB
   - Set status = 'open'
   - Set priority as selected

3. **Handle Attachments**
   - Upload files using attachment manager
   - Link to ticket: `owner_type='ticket'`, `owner_id=ticket_id`
   - Store metadata in `support_ticket_attachments`

4. **Create Activity Log**
   - Log ticket creation in `support_ticket_activity_log`

5. **Notifications** (Backend to implement)
   - Send confirmation email to user
   - Notify support team (email/Mattermost)
   - In-app notification

### Status Transitions:

```
Open
  ↓
In Progress (when support starts working)
  ↓
Waiting for User (when support needs more info)
  ↓
In Progress (when user responds)
  ↓
Resolved (when issue is fixed)
  ↓
Closed (after user confirmation or auto-close)
```

---

## 🗄️ Backend API Endpoints

### 1. Create Ticket
```http
POST /api/tickets

Request Body:
{
  "category": "approvals_workflow",
  "module": "finance",
  "title": "Unable to approve invoice",
  "description": "When I try to approve...",
  "priority": "high",
  "system_info": {
    "browser": "Chrome",
    "device": "Desktop",
    "erp_version": "2.0.1",
    "os": "Windows 11",
    "user_id": "usr_123456",
    "hub_id": "hub_mumbai",
    "timestamp": "2025-11-13T18:30:15.000Z"
  },
  "attachments": [
    {
      "id": "att_001",
      "file_name": "error-screenshot.png",
      "file_url": "...",
      "file_size": 245000
    }
  ]
}

Response:
{
  "success": true,
  "ticket": {
    "id": "ticket_uuid",
    "ticket_number": "TCK-2031",
    "status": "open",
    "created_at": "2025-11-13T18:30:15.000Z"
  },
  "message": "Ticket created successfully"
}
```

### 2. Get User Tickets
```http
GET /api/tickets?user_id={user_id}&status={status}&module={module}

Response:
{
  "tickets": [
    {
      "id": "ticket_uuid",
      "ticket_number": "TCK-2031",
      "title": "Unable to approve invoice",
      "category": "approvals_workflow",
      "module": "finance",
      "priority": "high",
      "status": "in_progress",
      "created_at": "2025-11-13T18:30:15.000Z",
      "updated_at": "2025-11-13T20:00:00.000Z"
    }
  ],
  "total": 1,
  "page": 1,
  "pageSize": 20
}
```

### 3. Get Ticket Details
```http
GET /api/tickets/{ticket_id}

Response:
{
  "ticket": {
    "id": "ticket_uuid",
    "ticket_number": "TCK-2031",
    "title": "Unable to approve invoice",
    "description": "...",
    "category": "approvals_workflow",
    "module": "finance",
    "priority": "high",
    "status": "in_progress",
    "system_info": {...},
    "attachments": [...],
    "comments": [...],
    "activity_log": [...]
  }
}
```

### 4. Add Comment
```http
POST /api/tickets/{ticket_id}/comments

Request Body:
{
  "message": "I've tried logging out and back in...",
  "attachments": [...]
}

Response:
{
  "comment": {
    "id": "comment_uuid",
    "message": "...",
    "created_at": "2025-11-13T18:35:00.000Z"
  },
  "message": "Comment posted successfully"
}
```

### 5. Update Status (Admin)
```http
PATCH /api/tickets/{ticket_id}/status

Request Body:
{
  "status": "in_progress",
  "internal_note": "Started working on this issue"
}
```

### 6. Assign Ticket (Admin)
```http
PATCH /api/tickets/{ticket_id}/assign

Request Body:
{
  "assigned_to": "support_user_uuid"
}
```

---

## 🎯 Optional Features (Recommended)

### 1. AI Auto-Suggestion
Before submitting, show recommended help articles:
```
💡 Similar Issues Found:
• "How to fix approval permission errors" (3 min read)
• "Configuring workflow approvals" (5 min read)
• "Troubleshooting invoice issues" (Video)
```

### 2. Auto-Assign Tickets
Route tickets automatically:
- `approvals_workflow` → Workflow Team
- `payment_billing` → Finance Team
- `mattermost_chatbot` → AI Team
- `erp_performance` → DevOps Team

### 3. SLA Timers
Response time targets:
- **Critical**: 1 hour
- **High**: 6 hours
- **Medium**: 24 hours
- **Low**: 72 hours

Display countdown timer on ticket:
```
⏱️ Response due in: 4 hours 23 minutes
```

### 4. Priority Escalation
Auto-escalate if:
- High priority ticket open > 12 hours
- Critical ticket open > 2 hours
- Waiting for User > 48 hours with no response

### 5. AI Assistant Auto-Fill
When user types error message:
```
🤖 AI Detected:
   Issue Type: Permission Error
   Likely Cause: Role misconfiguration
   Suggested Module: User settings
   
   [Auto-fill form] [Dismiss]
```

---

## 📊 Updated Files Summary

### Frontend Files Modified:
1. ✅ `help-support.tsx`
   - Updated categories (9 new ones)
   - Updated modules (8 ERP-specific)
   - Changed status to "waiting_user"
   - Enhanced system info collection
   - Updated badge colors

2. ✅ `support.ts` (types)
   - Updated TicketCategory type
   - Updated TicketStatus type
   - Enhanced SystemInfo interface

3. ✅ `user-settings.tsx`
   - Changed Help & Support from button to tab
   - Added hero section
   - Added quick links

4. ✅ `attachments.ts`
   - Extended AttachmentOwner type for tickets

### Database Files Modified:
1. ✅ `create_support_tickets_system.sql`
   - Updated category constraints
   - Updated status constraints
   - Added hub_id column
   - Changed ticket format to TCK-####
   - Updated sample data

---

## ✅ Testing Checklist

### Database Testing:
- [ ] Run migration script
- [ ] Verify ticket number format: `TCK-0001`, `TCK-0002`
- [ ] Test category constraints (9 categories)
- [ ] Test status constraints (5 statuses including "waiting_user")
- [ ] Verify hub_id column exists

### Frontend Testing:
- [ ] Open User Settings → Help & Support tab
- [ ] Click "Go to Help & Support Center"
- [ ] Create ticket with new categories
- [ ] Select modules (Finance, HR, Logistics, etc.)
- [ ] Verify system info shows user_id, hub_id, timestamp
- [ ] Upload attachments
- [ ] Submit ticket
- [ ] View ticket in "My Tickets" list
- [ ] Filter by status "Waiting for User"
- [ ] Open ticket details
- [ ] Post comment
- [ ] Verify ticket number format TCK-####

### API Testing (When Backend Ready):
- [ ] POST /api/tickets - Create with new categories
- [ ] GET /api/tickets - Filter by module
- [ ] GET /api/tickets/{id} - Verify hub_id in response
- [ ] POST /api/tickets/{id}/comments - Add comment
- [ ] PATCH /api/tickets/{id}/status - Update to "waiting_user"

---

## 🚀 Next Steps

### Immediate (Week 1):
1. Run database migration
2. Test frontend ticket creation
3. Implement backend APIs (7 endpoints)
4. Test end-to-end flow

### Short-term (Week 2-3):
1. Email notifications setup
2. Mattermost integration
3. Auto-assignment rules
4. SLA timer implementation

### Medium-term (Month 2):
1. AI auto-suggestions
2. Knowledge base integration
3. Advanced analytics
4. Priority escalation

---

**Updated**: November 13, 2025  
**Version**: 2.0 (TCK Format)  
**Status**: ✅ Frontend Complete | ⏳ Backend Pending

