# Help & Support Module - Complete Documentation

## 📋 Overview

A comprehensive Help & Support ticketing system integrated into the BISMAN ERP, allowing users to submit support tickets, track their progress, communicate with support staff, and access a knowledge base.

## ✨ Features Implemented

### 1. **Create New Ticket** 
- **Category Selection**: Bug, Feature Request, Question, Access Issue, Performance, Data Issue, Other
- **Module Selection**: Dashboard, User Management, Finance, Operations, Procurement, Compliance, Reports, System Settings, Other
- **Rich Form Fields**:
  - Title (required, brief summary)
  - Description (required, detailed information with 20+ character minimum)
  - Priority levels: Low, Medium, High, Critical
  - File attachments (up to 5 files, 10MB each, supports PNG, JPG, PDF, DOC)
- **Auto-collected System Information**:
  - Browser type
  - Device type (Desktop/Mobile/Tablet)
  - Operating System
  - ERP Version
- **Real-time Validation**: Client-side form validation with error messages
- **File Upload Progress**: Visual feedback during attachment uploads

### 2. **My Tickets List**
- **Comprehensive Table View**:
  - Ticket Number with status icon
  - Title
  - Category
  - Module
  - Priority badge (color-coded)
  - Status badge (color-coded)
  - Last Updated timestamp
  - View Details action
- **Advanced Filtering**:
  - Search by ticket number, title, or description
  - Filter by status: All, Open, In Progress, Waiting Response, Resolved, Closed
  - Filter by module
- **Status Indicators**:
  - Open (Blue with AlertCircle icon)
  - In Progress (Yellow with Clock icon)
  - Waiting Response (Orange)
  - Resolved (Green with CheckCircle icon)
  - Closed (Gray with XCircle icon)
- **Empty States**: Helpful messages when no tickets found

### 3. **Ticket Detail View**
- **Ticket Metadata Card**:
  - Ticket number and title
  - Status and priority badges
  - Category and module information
  - Created and updated timestamps
  - Full description
  - Initial attachments with download links
  - System information display
  
- **Conversation Thread**:
  - All comments with user avatars
  - User name and role display
  - Timestamp for each comment
  - Comment attachments with download
  - Visual distinction between support staff and users
  
- **Add New Comment**:
  - Rich text area for message
  - Attach files to comments
  - Real-time validation
  - Post comment button with loading state
  
- **Activity Timeline**:
  - Chronological log of all ticket activities
  - User actions (created, updated, status changed, assigned, etc.)
  - Timestamps for each activity

### 4. **Integration with User Settings**
- **Help & Support Button**: 
  - Prominently placed in user settings page header
  - Icon with "Help & Support" label
  - Direct navigation to help-support page
  - Styled consistently with ERP design system

### 5. **UI/UX Excellence**
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile
- **Dark Mode Support**: All components support light and dark themes
- **Toast Notifications**: Success/error messages for all actions
- **Loading States**: Spinners and disabled states during async operations
- **Empty States**: Helpful messages with CTAs when no data
- **Color-Coded Priority**: Visual hierarchy for ticket urgency
- **Consistent Styling**: Follows ERP design patterns with Tailwind CSS

## 🗂️ File Structure

```
my-frontend/
├── src/
│   ├── modules/
│   │   └── common/
│   │       └── pages/
│   │           ├── help-support.tsx        # Main Help & Support page (NEW)
│   │           └── user-settings.tsx       # Updated with Help button
│   └── types/
│       └── support.ts                      # TypeScript types (NEW)
│
database/
└── migrations/
    └── create_support_tickets_system.sql   # Complete DB schema (NEW)
```

## 📊 Database Schema

### Tables Created

1. **support_tickets**
   - Primary ticket information
   - User and assignment tracking
   - Status, priority, category fields
   - System info (JSONB)
   - Timestamps (created, updated, resolved, closed)
   - Tags and internal notes

2. **support_ticket_comments**
   - Conversation thread
   - User messages
   - Internal notes flag
   - Timestamps

3. **support_ticket_attachments**
   - File uploads for tickets and comments
   - File metadata (name, URL, size, type)
   - Uploader tracking

4. **support_ticket_activity_log**
   - Audit trail
   - All ticket changes
   - User actions logged

5. **support_categories** (Reference)
   - Category definitions
   - Labels and descriptions

6. **support_modules** (Reference)
   - Module definitions
   - Labels and descriptions

### Key Features

- **Auto-incrementing Ticket Numbers**: `TKT-000001` format
- **Indexes**: Optimized for search and filtering
- **Views**: Pre-built queries for common operations
  - `v_ticket_summary`: Ticket list with user details
  - `v_ticket_statistics`: Dashboard statistics
- **Triggers**: Automatic timestamp updates
- **Constraints**: Data validation at DB level
- **Foreign Keys**: Referential integrity maintained

## 🔧 Backend API Endpoints (To Be Implemented)

### Required Endpoints

```typescript
// 1. List user's tickets
GET /api/support/tickets
Query Params:
  - search?: string
  - status?: string
  - module?: string
  - page?: number
  - pageSize?: number
Response: {
  tickets: Ticket[],
  total: number,
  page: number,
  pageSize: number
}

// 2. Create new ticket
POST /api/support/tickets
Body: {
  category: string,
  module: string,
  title: string,
  description: string,
  priority: string,
  system_info: object,
  attachments: array
}
Response: {
  ticket: Ticket,
  message: string
}

// 3. Get ticket details
GET /api/support/tickets/:ticketId
Response: {
  ticket: Ticket // includes comments, attachments, activity_log
}

// 4. Post comment on ticket
POST /api/support/tickets/:ticketId/comments
Body: {
  message: string,
  attachments: array
}
Response: {
  comment: Comment,
  message: string
}

// 5. Update ticket status (admin only)
PATCH /api/support/tickets/:ticketId/status
Body: {
  status: string,
  internal_note?: string
}

// 6. Assign ticket (admin only)
PATCH /api/support/tickets/:ticketId/assign
Body: {
  assigned_to: string (user_id)
}

// 7. Get ticket statistics (admin only)
GET /api/support/statistics
Response: {
  stats: TicketStats
}
```

## 🚀 Usage Guide

### For End Users

#### Creating a Ticket

1. Navigate to **User Settings**
2. Click **Help & Support** button in the header
3. Click **Create New Ticket** button
4. Fill in the form:
   - Select issue category
   - Select affected module
   - Enter descriptive title
   - Provide detailed description (min 20 characters)
   - Choose priority level
   - Optionally attach files (screenshots, documents)
5. Review auto-collected system information
6. Click **Submit Ticket**
7. Note your ticket number (e.g., TKT-000123)

#### Viewing Your Tickets

1. Go to Help & Support page
2. Use search to find specific tickets
3. Apply filters for status/module
4. Click **View Details** to see full conversation

#### Communicating on a Ticket

1. Open ticket details
2. Scroll to "Conversation" section
3. Type your message
4. Optionally attach files
5. Click **Post Comment**
6. Wait for support response

### For Support Staff

#### Managing Tickets

1. Access support dashboard (admin portal)
2. View all open tickets with filters
3. Assign tickets to team members
4. Update ticket status as work progresses
5. Add internal notes (not visible to users)
6. Close resolved tickets

## 🎨 Design System

### Color Coding

**Priority Badges**:
- Low: Gray `bg-gray-100 text-gray-700`
- Medium: Blue `bg-blue-100 text-blue-700`
- High: Orange `bg-orange-100 text-orange-700`
- Critical: Red `bg-red-100 text-red-700`

**Status Badges**:
- Open: Blue `bg-blue-100 text-blue-800`
- In Progress: Yellow `bg-yellow-100 text-yellow-800`
- Waiting Response: Orange `bg-orange-100 text-orange-800`
- Resolved: Green `bg-green-100 text-green-800`
- Closed: Gray `bg-gray-100 text-gray-800`

### Icons (Lucide React)

- HelpCircle: Main help icon
- Plus: Create new ticket
- Search: Search functionality
- Filter: Filtering options
- Paperclip: Attachments
- Send: Submit actions
- Eye: View details
- MessageSquare: Comments
- Activity: Activity log
- Download: Download files
- Trash2: Delete items

## 📈 Future Enhancements

### Phase 2 Features

1. **Live Chat Integration**
   - Real-time chat widget
   - Instant messaging with support
   - Chat history preservation

2. **Knowledge Base**
   - Searchable articles
   - Video tutorials
   - FAQs with categories
   - Step-by-step guides

3. **AI-Powered Features**
   - Smart ticket categorization
   - Suggested solutions based on description
   - Auto-response to common questions
   - Sentiment analysis

4. **Advanced Analytics**
   - Support dashboard with charts
   - Response time metrics
   - User satisfaction scores
   - Trending issues report

5. **Email Notifications**
   - Ticket creation confirmation
   - Status update alerts
   - New comment notifications
   - Resolution notifications

6. **Service Level Agreements (SLA)**
   - Response time targets
   - Resolution time tracking
   - SLA breach alerts
   - Priority-based SLA tiers

7. **Multi-language Support**
   - Translated UI
   - Multilingual tickets
   - Auto-translation of comments

8. **Mobile App**
   - Native iOS/Android apps
   - Push notifications
   - Offline access to ticket history

## 🔒 Security Considerations

### Implemented

- ✅ User authentication required
- ✅ CSRF protection via credentials
- ✅ File type validation
- ✅ File size limits (10MB per file)
- ✅ SQL injection prevention (parameterized queries)
- ✅ XSS prevention (React's built-in escaping)

### To Implement

- [ ] Rate limiting on ticket creation
- [ ] File virus scanning
- [ ] Data encryption at rest
- [ ] Role-based access control for ticket assignment
- [ ] Audit logging for admin actions
- [ ] GDPR compliance (data export/deletion)

## 🧪 Testing Checklist

### Frontend Testing

- [ ] Create ticket form validation
- [ ] File upload functionality
- [ ] Search and filtering
- [ ] Ticket list pagination
- [ ] Comment posting
- [ ] Responsive design on mobile
- [ ] Dark mode compatibility
- [ ] Error handling and toast notifications
- [ ] Loading states during async operations

### Backend Testing

- [ ] API endpoint authentication
- [ ] Ticket creation with attachments
- [ ] Comment creation with attachments
- [ ] Ticket list with filters
- [ ] Ticket detail with full data
- [ ] Status updates
- [ ] Assignment functionality
- [ ] Activity log generation
- [ ] Database constraints validation
- [ ] Performance with large datasets

### Integration Testing

- [ ] End-to-end ticket lifecycle
- [ ] User permissions and access control
- [ ] File upload to storage
- [ ] Email notifications (if implemented)
- [ ] Search functionality accuracy

## 📞 Support

For issues with the Help & Support module itself:
- Contact: System Administrator
- Email: admin@bismanerp.com
- Internal Ticket: Create ticket with category "Bug" and module "System Settings"

---

## 🎯 Quick Start Summary

1. **Database Setup**: Run `create_support_tickets_system.sql` migration
2. **Frontend**: Help & Support page is at `/common/help-support`
3. **Access**: Click "Help & Support" button in User Settings
4. **Backend**: Implement the 7 API endpoints listed above
5. **Test**: Create a test ticket and verify full workflow

**Status**: ✅ Frontend Complete | ⏳ Backend Pending | 📋 Documentation Complete

