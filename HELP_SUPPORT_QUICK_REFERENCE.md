# Help & Support Module - Quick Reference

## 🎯 At a Glance

**Purpose**: Enterprise-grade support ticketing system integrated into BISMAN ERP  
**Status**: ✅ Frontend Complete | ⏳ Backend APIs Pending  
**Access Point**: User Settings → "Help & Support" button

---

## 📁 Files Created/Modified

| File | Type | Description |
|------|------|-------------|
| `/my-frontend/src/modules/common/pages/help-support.tsx` | NEW | Main help & support page (800+ lines) |
| `/my-frontend/src/types/support.ts` | NEW | TypeScript type definitions |
| `/database/migrations/create_support_tickets_system.sql` | NEW | Complete database schema |
| `/my-frontend/src/modules/common/pages/user-settings.tsx` | MODIFIED | Added Help & Support button |
| `HELP_SUPPORT_MODULE_COMPLETE.md` | NEW | Complete documentation |
| `HELP_SUPPORT_QUICK_REFERENCE.md` | NEW | This file |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────┐
│           User Settings Page                     │
│  ┌─────────────────────────────────────────┐   │
│  │  [Profile] [Preferences] [Help & Support]│   │
│  └─────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│        Help & Support Page                       │
│  ┌──────────────┬──────────────┬────────────┐  │
│  │ List Tickets │ Create Ticket│ View Detail│  │
│  └──────────────┴──────────────┴────────────┘  │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│            Backend APIs                          │
│  • GET /api/support/tickets                     │
│  • POST /api/support/tickets                    │
│  • GET /api/support/tickets/:id                 │
│  • POST /api/support/tickets/:id/comments       │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│         PostgreSQL Database                      │
│  • support_tickets                              │
│  • support_ticket_comments                      │
│  • support_ticket_attachments                   │
│  • support_ticket_activity_log                  │
└─────────────────────────────────────────────────┘
```

---

## 🎨 UI Components Overview

### 1. **Ticket List View** (Default)
- Search bar across ticket number, title, description
- Filters: Status (5 options) + Module (9 options)
- Table with 8 columns: Ticket #, Title, Category, Module, Priority, Status, Last Updated, Actions
- "Create New Ticket" button (top-right)
- Empty state with helpful message

### 2. **Create Ticket View**
- Form Fields:
  - Category dropdown (7 options)
  - Module dropdown (9 options)
  - Title input (required)
  - Description textarea (required, min 20 chars)
  - Priority selector (4 buttons: Low, Medium, High, Critical)
  - File upload area (drag-and-drop, multi-file)
- Auto-collected system info (collapsible)
- Cancel & Submit buttons

### 3. **Ticket Detail View**
- **Top Section**: Metadata card
  - Ticket #, title, status, priority badges
  - Category, module, timestamps
  - Description
  - Initial attachments
  - System info
- **Middle Section**: Conversation thread
  - All comments with avatars
  - User info and timestamps
  - Comment attachments
- **Bottom Section**: Add comment
  - Message textarea
  - Attach files button
  - Post comment button
- **Activity Timeline** (if available)

---

## 🎯 Key Features Checklist

### User-Facing Features
- ✅ Create support ticket with rich form
- ✅ Upload attachments (5 files, 10MB each)
- ✅ View all my tickets in table
- ✅ Search tickets by number/title/description
- ✅ Filter by status and module
- ✅ View ticket details with full conversation
- ✅ Post comments on tickets
- ✅ Attach files to comments
- ✅ Download attachments
- ✅ See activity timeline
- ✅ Auto-collected system information
- ✅ Toast notifications for actions
- ✅ Responsive design (mobile-friendly)
- ✅ Dark mode support

### Admin Features (Backend Required)
- ⏳ Assign tickets to support staff
- ⏳ Update ticket status
- ⏳ Add internal notes
- ⏳ View all tickets (not just own)
- ⏳ Ticket statistics dashboard
- ⏳ Close resolved tickets

---

## 🗄️ Database Schema Summary

### Main Tables

**support_tickets**
```sql
- id (UUID, PK)
- ticket_number (VARCHAR, UNIQUE) -- TKT-000001
- title, description
- category, module, priority, status
- user_id, assigned_to
- system_info (JSONB)
- created_at, updated_at, resolved_at, closed_at
```

**support_ticket_comments**
```sql
- id (UUID, PK)
- ticket_id (FK)
- user_id (FK)
- message
- is_internal (BOOLEAN)
- created_at, updated_at
```

**support_ticket_attachments**
```sql
- id (UUID, PK)
- ticket_id or comment_id (FK)
- file_name, file_url, file_size, file_type
- uploaded_by (FK)
- uploaded_at
```

**support_ticket_activity_log**
```sql
- id (UUID, PK)
- ticket_id (FK)
- user_id (FK)
- action, details
- old_value, new_value
- created_at
```

### Special Features
- **Ticket Number Generator**: `generate_ticket_number()` function
- **Auto-update Triggers**: `updated_at` fields
- **Views**: `v_ticket_summary`, `v_ticket_statistics`
- **Indexes**: 15+ indexes for performance
- **Constraints**: Data validation at DB level

---

## 🚀 Deployment Steps

### 1. Database Migration
```bash
# Connect to PostgreSQL
psql -U your_user -d bisman_erp

# Run migration
\i database/migrations/create_support_tickets_system.sql

# Verify tables
\dt support*
```

### 2. Backend API Implementation
Create 7 endpoints:
1. `GET /api/support/tickets` - List tickets
2. `POST /api/support/tickets` - Create ticket
3. `GET /api/support/tickets/:id` - Get ticket details
4. `POST /api/support/tickets/:id/comments` - Post comment
5. `PATCH /api/support/tickets/:id/status` - Update status (admin)
6. `PATCH /api/support/tickets/:id/assign` - Assign ticket (admin)
7. `GET /api/support/statistics` - Get statistics (admin)

### 3. Frontend Deployment
Already complete! Files are ready at:
- `/modules/common/pages/help-support.tsx`
- `/modules/common/pages/user-settings.tsx` (updated)

### 4. Testing
1. Create test ticket
2. Upload attachment
3. Post comment
4. Search and filter
5. Test mobile responsiveness
6. Verify dark mode

---

## 📋 Backend API Requirements

### Example: Create Ticket Endpoint

```typescript
// POST /api/support/tickets
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return unauthorized();

  const body = await req.json();
  const {
    category,
    module,
    title,
    description,
    priority,
    system_info,
    attachments
  } = body;

  // Generate ticket number
  const ticketNumber = await db.query(
    'SELECT generate_ticket_number()'
  );

  // Insert ticket
  const result = await db.query(`
    INSERT INTO support_tickets (
      ticket_number, title, description,
      category, module, priority,
      user_id, system_info
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *
  `, [
    ticketNumber.rows[0].generate_ticket_number,
    title, description, category, module,
    priority, session.user.id,
    JSON.stringify(system_info)
  ]);

  // Link attachments
  if (attachments?.length > 0) {
    for (const att of attachments) {
      await db.query(`
        INSERT INTO support_ticket_attachments (
          ticket_id, file_name, file_url,
          file_size, uploaded_by
        ) VALUES ($1, $2, $3, $4, $5)
      `, [
        result.rows[0].id,
        att.file_name,
        att.file_url,
        att.file_size,
        session.user.id
      ]);
    }
  }

  // Log activity
  await db.query(`
    INSERT INTO support_ticket_activity_log (
      ticket_id, user_id, action, details
    ) VALUES ($1, $2, $3, $4)
  `, [
    result.rows[0].id,
    session.user.id,
    'created',
    'Ticket created'
  ]);

  return json({
    ticket: result.rows[0],
    message: 'Ticket created successfully'
  });
}
```

---

## 🎨 Styling Reference

### Tailwind Classes Used

**Cards**: `bg-white rounded-lg shadow-sm border border-gray-200 p-6`  
**Buttons**: `px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700`  
**Inputs**: `px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500`  
**Badges**: `px-2.5 py-0.5 rounded-full text-xs font-medium`  
**Toast**: `fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg`

### Dark Mode Support
All components use `dark:` variants:
- `dark:bg-gray-900`
- `dark:text-gray-100`
- `dark:border-gray-700`

---

## 🔍 Testing Commands

### Database Testing
```sql
-- Create test ticket
SELECT generate_ticket_number();

-- Check constraints
INSERT INTO support_tickets (ticket_number, title, description, category, module, user_id)
VALUES ('TKT-000001', 'Test', 'Test description for ticket', 'bug', 'dashboard', 'user-uuid-here');

-- Query with view
SELECT * FROM v_ticket_summary WHERE user_id = 'user-uuid';

-- Get statistics
SELECT * FROM v_ticket_statistics;
```

### Frontend Testing
1. Navigate to `/common/help-support`
2. Create ticket without filling required fields → See validation errors
3. Fill form and submit → See success toast
4. Filter tickets by status → Table updates
5. Search for ticket → Results filter
6. View ticket details → Full data loads
7. Post comment → Comment appears in thread

---

## 🐛 Troubleshooting

### Common Issues

**Issue**: "Help & Support button not visible"  
**Fix**: Check user-settings.tsx was updated correctly, router imported

**Issue**: "Database migration fails"  
**Fix**: Ensure PostgreSQL extensions (pg_trgm) are installed:
```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
```

**Issue**: "Attachments not uploading"  
**Fix**: Verify `/api/upload/profile-pic` endpoint or adjust to use ticket upload endpoint

**Issue**: "Ticket numbers not sequential"  
**Fix**: Check `ticket_number_seq` sequence exists and has proper permissions

**Issue**: "Dark mode looks broken"  
**Fix**: Ensure all components have `dark:` variant classes

---

## 📊 Metrics to Track

### User Metrics
- Total tickets created
- Average tickets per user
- Most common categories
- Most affected modules
- User satisfaction ratings

### Performance Metrics
- Average response time
- Average resolution time
- First response time
- SLA compliance rate
- Ticket reopening rate

### System Metrics
- Tickets by status (open, in progress, resolved, closed)
- Tickets by priority (critical, high, medium, low)
- Peak ticket creation times
- Attachment usage statistics
- Comment frequency

---

## 🎓 Training Guide

### For End Users
1. **Accessing Help & Support**: Settings → Help & Support button
2. **Creating Tickets**: Be specific, attach screenshots, choose correct module
3. **Tracking Tickets**: Use search and filters to find your tickets
4. **Communicating**: Reply to comments promptly for faster resolution

### For Support Staff
1. **Triaging**: Review new tickets, assign priority and category
2. **Assigning**: Assign tickets to appropriate team members
3. **Responding**: Provide clear, actionable responses
4. **Closing**: Verify resolution before closing tickets
5. **Internal Notes**: Use for internal communication

---

## 📞 Contact

**For Module Support**:
- Developer: GitHub Copilot
- Documentation: See `HELP_SUPPORT_MODULE_COMPLETE.md`
- Backend API Specs: See documentation file

**For System Issues**:
- Create ticket with category "Bug" and module "System Settings"
- Provide detailed steps to reproduce

---

## ✅ Next Steps

1. **Immediate**:
   - [ ] Run database migration
   - [ ] Test frontend functionality
   - [ ] Verify Help & Support button in User Settings

2. **Short-term** (This Week):
   - [ ] Implement 7 backend API endpoints
   - [ ] Test end-to-end ticket creation
   - [ ] Set up file upload endpoint for tickets
   - [ ] Configure email notifications

3. **Medium-term** (This Month):
   - [ ] Add admin dashboard for ticket management
   - [ ] Implement role-based access control
   - [ ] Create ticket statistics page
   - [ ] Build knowledge base integration

4. **Long-term** (Next Quarter):
   - [ ] AI-powered ticket categorization
   - [ ] Live chat integration
   - [ ] Mobile app for support
   - [ ] Advanced analytics dashboard

---

**Last Updated**: 2025-01-XX  
**Version**: 1.0.0  
**Status**: Frontend Complete ✅ | Backend Pending ⏳

