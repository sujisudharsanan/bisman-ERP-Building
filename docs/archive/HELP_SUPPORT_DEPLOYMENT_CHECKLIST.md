# Help & Support Module - Deployment Checklist

Use this checklist to track the deployment and testing of the Help & Support module.

---

## Phase 1: Database Setup

### Database Migration
- [ ] Connect to PostgreSQL database
  ```bash
  psql -U your_user -d bisman_erp
  ```
- [ ] Enable pg_trgm extension (if not already enabled)
  ```sql
  CREATE EXTENSION IF NOT EXISTS pg_trgm;
  ```
- [ ] Run the migration script
  ```bash
  \i database/migrations/create_support_tickets_system.sql
  ```
- [ ] Verify tables created
  ```sql
  \dt support*
  -- Should show 6 tables
  ```
- [ ] Verify views created
  ```sql
  \dv v_ticket*
  -- Should show 2 views
  ```
- [ ] Verify function created
  ```sql
  SELECT generate_ticket_number();
  -- Should return TKT-000001
  ```
- [ ] Test ticket creation
  ```sql
  INSERT INTO support_tickets (ticket_number, title, description, category, module, user_id)
  VALUES (generate_ticket_number(), 'Test Ticket', 'Test description', 'bug', 'dashboard', '<user-uuid>');
  SELECT * FROM v_ticket_summary WHERE ticket_number LIKE 'TKT%';
  ```

---

## Phase 2: Backend API Implementation

### API Endpoint 1: List Tickets
- [ ] Create `GET /api/support/tickets`
- [ ] Implement authentication check
- [ ] Implement query parameters (search, status, module, page, pageSize)
- [ ] Return user's tickets only (security check)
- [ ] Include pagination metadata
- [ ] Test with Postman/cURL
- [ ] Verify response format matches frontend expectations

### API Endpoint 2: Create Ticket
- [ ] Create `POST /api/support/tickets`
- [ ] Implement authentication check
- [ ] Validate request body (category, module, title, description, priority)
- [ ] Generate ticket number
- [ ] Insert ticket to database
- [ ] Link attachments (if any)
- [ ] Create activity log entry
- [ ] Return created ticket with ticket number
- [ ] Test with Postman/cURL
- [ ] Verify ticket appears in database

### API Endpoint 3: Get Ticket Details
- [ ] Create `GET /api/support/tickets/:id`
- [ ] Implement authentication check
- [ ] Verify user owns ticket (security check)
- [ ] Fetch ticket with all relations (comments, attachments, activity_log)
- [ ] Include user details in comments
- [ ] Test with Postman/cURL
- [ ] Verify all nested data is included

### API Endpoint 4: Post Comment
- [ ] Create `POST /api/support/tickets/:id/comments`
- [ ] Implement authentication check
- [ ] Verify user owns ticket (security check)
- [ ] Validate request body (message, attachments)
- [ ] Insert comment to database
- [ ] Link comment attachments (if any)
- [ ] Create activity log entry
- [ ] Update ticket updated_at timestamp
- [ ] Return created comment
- [ ] Test with Postman/cURL
- [ ] Verify comment appears in ticket details

### API Endpoint 5: Update Ticket Status (Admin)
- [ ] Create `PATCH /api/support/tickets/:id/status`
- [ ] Implement authentication check
- [ ] Implement admin role check
- [ ] Validate status value
- [ ] Update ticket status
- [ ] Update resolved_at or closed_at if applicable
- [ ] Create activity log entry
- [ ] Optional: Send email notification to user
- [ ] Test with Postman/cURL
- [ ] Verify status update in database

### API Endpoint 6: Assign Ticket (Admin)
- [ ] Create `PATCH /api/support/tickets/:id/assign`
- [ ] Implement authentication check
- [ ] Implement admin role check
- [ ] Validate assigned_to user exists
- [ ] Update ticket assignment
- [ ] Create activity log entry
- [ ] Optional: Send email notification to assigned user
- [ ] Test with Postman/cURL
- [ ] Verify assignment in database

### API Endpoint 7: Get Statistics (Admin)
- [ ] Create `GET /api/support/statistics`
- [ ] Implement authentication check
- [ ] Implement admin role check
- [ ] Query v_ticket_statistics view
- [ ] Calculate additional metrics if needed
- [ ] Return statistics object
- [ ] Test with Postman/cURL
- [ ] Verify calculations are correct

---

## Phase 3: File Upload Configuration

### Attachment Handling
- [ ] Verify `/api/attachments/complete` endpoint exists
- [ ] Configure file storage (S3, local filesystem, etc.)
- [ ] Set maximum file size (10MB)
- [ ] Whitelist file types (image/*, .pdf, .doc, .docx)
- [ ] Implement virus scanning (recommended)
- [ ] Test uploading various file types
- [ ] Test file size limit enforcement
- [ ] Verify attachment URLs are accessible
- [ ] Test attachment download functionality

---

## Phase 4: Frontend Testing

### Navigation
- [ ] Navigate to User Settings page
- [ ] Verify "Help & Support" button is visible
- [ ] Click "Help & Support" button
- [ ] Verify redirect to `/common/help-support`
- [ ] Verify page loads without errors

### Create Ticket Flow
- [ ] Click "Create New Ticket" button
- [ ] Verify form appears
- [ ] Test category dropdown (7 options)
- [ ] Test module dropdown (9 options)
- [ ] Leave required fields empty and click Submit
- [ ] Verify validation errors appear
- [ ] Fill in title (valid)
- [ ] Fill in description (< 20 characters)
- [ ] Verify minimum length error
- [ ] Fill in description (>= 20 characters)
- [ ] Select priority (Low, Medium, High, Critical)
- [ ] Upload a file (valid type, valid size)
- [ ] Verify file appears in list
- [ ] Upload invalid file type
- [ ] Verify error message
- [ ] Upload file > 10MB
- [ ] Verify size error
- [ ] Remove attached file
- [ ] Expand system info section
- [ ] Verify browser, OS, device displayed correctly
- [ ] Click Submit
- [ ] Verify loading state (spinner)
- [ ] Wait for success toast
- [ ] Verify redirected to ticket list
- [ ] Verify new ticket appears in list

### Ticket List View
- [ ] Verify ticket list loads
- [ ] Verify table columns (Ticket #, Title, Category, Module, Priority, Status, Last Updated, Actions)
- [ ] Test search by ticket number
- [ ] Verify filtered results
- [ ] Test search by title keywords
- [ ] Verify filtered results
- [ ] Clear search
- [ ] Test status filter (Open)
- [ ] Verify only open tickets shown
- [ ] Test status filter (Resolved)
- [ ] Verify only resolved tickets shown
- [ ] Reset status filter to "All"
- [ ] Test module filter (specific module)
- [ ] Verify only tickets from that module shown
- [ ] Reset module filter to "All"
- [ ] Combine search + filters
- [ ] Verify results match all criteria
- [ ] Verify priority badges are color-coded
- [ ] Verify status badges are color-coded
- [ ] Hover over table row
- [ ] Verify hover effect

### Ticket Detail View
- [ ] Click "View Details" on a ticket
- [ ] Verify ticket detail page loads
- [ ] Verify ticket number, title displayed
- [ ] Verify status and priority badges
- [ ] Verify category and module
- [ ] Verify created and updated timestamps
- [ ] Verify full description
- [ ] Verify initial attachments (if any)
- [ ] Click download on attachment
- [ ] Verify file downloads
- [ ] Verify system info displayed
- [ ] Scroll to conversation section
- [ ] Verify all comments shown
- [ ] Verify user avatars and names
- [ ] Verify comment timestamps
- [ ] Verify comment attachments (if any)
- [ ] Scroll to "Add Comment" section
- [ ] Type a message
- [ ] Click "Post Comment" (no message)
- [ ] Verify validation error
- [ ] Type a valid message
- [ ] Click "Attach Files"
- [ ] Select a file
- [ ] Verify file appears below
- [ ] Remove attached file
- [ ] Re-attach file
- [ ] Click "Post Comment"
- [ ] Verify loading state
- [ ] Wait for success toast
- [ ] Verify comment appears in thread
- [ ] Scroll to Activity Timeline (if visible)
- [ ] Verify activity entries shown
- [ ] Click "Back to Tickets"
- [ ] Verify return to list view

### Empty States
- [ ] Clear all tickets (or use filters to show none)
- [ ] Verify empty state message
- [ ] Verify "Create New Ticket" button in empty state
- [ ] Open ticket with no comments
- [ ] Verify "No comments yet" message
- [ ] Search for non-existent term
- [ ] Verify "No tickets found" message

### Responsive Design
- [ ] Resize browser to tablet width (768px - 1199px)
- [ ] Verify layout adjusts
- [ ] Verify table is readable
- [ ] Resize to mobile width (< 768px)
- [ ] Verify mobile-friendly layout
- [ ] Verify buttons are accessible
- [ ] Test create ticket form on mobile
- [ ] Test ticket list on mobile
- [ ] Test ticket detail on mobile

### Dark Mode
- [ ] Switch to dark mode
- [ ] Verify all colors adapt
- [ ] Verify text is readable
- [ ] Verify buttons have proper contrast
- [ ] Verify modals/cards have dark background
- [ ] Switch back to light mode
- [ ] Verify everything still works

### Error Handling
- [ ] Disconnect internet
- [ ] Try to create ticket
- [ ] Verify error toast appears
- [ ] Reconnect internet
- [ ] Try again
- [ ] Verify success
- [ ] Test with invalid API responses (mock backend errors)
- [ ] Verify appropriate error messages shown

---

## Phase 5: Integration Testing

### End-to-End Scenarios

#### Scenario 1: User Reports Bug
- [ ] User logs in
- [ ] Navigates to User Settings → Help & Support
- [ ] Clicks "Create New Ticket"
- [ ] Selects category: "Bug / Error"
- [ ] Selects module: "Finance Module"
- [ ] Enters title: "Invoice calculation incorrect"
- [ ] Enters description: Detailed steps to reproduce
- [ ] Selects priority: "High"
- [ ] Uploads screenshot (PNG file)
- [ ] Submits ticket
- [ ] Receives ticket number (e.g., TKT-000045)
- [ ] Verifies ticket in list
- [ ] Opens ticket details
- [ ] Verifies all info is correct
- [ ] Adds follow-up comment
- [ ] Verifies comment posted

#### Scenario 2: Support Staff Responds
- [ ] Admin logs in
- [ ] Navigates to support dashboard (admin view)
- [ ] Sees new ticket (TKT-000045)
- [ ] Assigns ticket to support agent
- [ ] Changes status to "In Progress"
- [ ] Adds internal note (not visible to user)
- [ ] Posts comment to user
- [ ] User refreshes page
- [ ] User sees new comment
- [ ] User sees status changed to "In Progress"
- [ ] User replies with more info
- [ ] Support agent marks as "Resolved"
- [ ] User sees "Resolved" status
- [ ] User rates satisfaction (if feature exists)

#### Scenario 3: High Volume Test
- [ ] Create 10 tickets rapidly
- [ ] Verify all tickets created successfully
- [ ] Verify ticket numbers are sequential
- [ ] Filter by status
- [ ] Verify performance is acceptable
- [ ] Search across all tickets
- [ ] Verify search results accurate
- [ ] Open multiple ticket details
- [ ] Verify no memory leaks (check DevTools)

---

## Phase 6: Security Audit

### Authentication & Authorization
- [ ] Verify unauthenticated users cannot access endpoints
- [ ] Verify users can only see their own tickets
- [ ] Verify users cannot access other users' tickets (try direct URL)
- [ ] Verify admin endpoints require admin role
- [ ] Verify users cannot change other users' ticket status
- [ ] Verify users cannot delete tickets (no delete feature)
- [ ] Verify SQL injection is prevented (test with malicious input)
- [ ] Verify XSS is prevented (test with script tags in title/description)

### File Upload Security
- [ ] Verify file type validation works
- [ ] Try uploading executable (.exe, .sh, .bat)
- [ ] Verify rejection
- [ ] Try uploading oversized file
- [ ] Verify rejection
- [ ] Verify uploaded files are not executable on server
- [ ] Verify file URLs are secure (signed URLs recommended)
- [ ] Test virus scanning (if implemented)

### Data Validation
- [ ] Test with very long title (> 500 chars)
- [ ] Verify truncation or rejection
- [ ] Test with very long description (> 10,000 chars)
- [ ] Verify handling
- [ ] Test with invalid category value
- [ ] Verify rejection
- [ ] Test with invalid status value
- [ ] Verify rejection
- [ ] Test with null/undefined values
- [ ] Verify proper error messages

---

## Phase 7: Performance Testing

### Load Testing
- [ ] Simulate 10 concurrent users creating tickets
- [ ] Verify system handles load
- [ ] Simulate 50 concurrent users browsing tickets
- [ ] Verify response times acceptable (< 2 seconds)
- [ ] Test with 1,000+ tickets in database
- [ ] Verify pagination works
- [ ] Verify search performance
- [ ] Test file upload during high load
- [ ] Verify no timeouts

### Database Performance
- [ ] Run EXPLAIN ANALYZE on ticket list query
- [ ] Verify indexes are being used
- [ ] Run EXPLAIN ANALYZE on search query
- [ ] Verify full-text search indexes used
- [ ] Check for N+1 query problems
- [ ] Optimize queries if needed
- [ ] Test with 10,000+ tickets
- [ ] Verify query performance still acceptable

---

## Phase 8: Email Notifications (Optional)

### Setup Email Service
- [ ] Configure email service (SendGrid, AWS SES, etc.)
- [ ] Set up email templates
- [ ] Test email delivery

### Notification Types
- [ ] New ticket created → User receives confirmation
- [ ] New comment → User receives notification
- [ ] Status changed → User receives update
- [ ] Ticket assigned → Support agent receives notification
- [ ] Ticket resolved → User receives notification

### Email Testing
- [ ] Verify email content is correct
- [ ] Verify links in email work
- [ ] Verify unsubscribe link works (if applicable)
- [ ] Test on multiple email clients (Gmail, Outlook, etc.)
- [ ] Verify mobile email rendering

---

## Phase 9: Documentation Review

### For End Users
- [ ] Create user guide PDF
- [ ] Record video tutorial (create ticket)
- [ ] Record video tutorial (track ticket)
- [ ] Add FAQs to knowledge base
- [ ] Create quick reference card

### For Support Staff
- [ ] Create admin guide
- [ ] Document ticket triage process
- [ ] Document response templates
- [ ] Create troubleshooting guide
- [ ] Set up support staff training session

### For Developers
- [ ] Review API documentation
- [ ] Update API docs with examples
- [ ] Document database schema
- [ ] Add inline code comments
- [ ] Update README with setup instructions

---

## Phase 10: User Acceptance Testing (UAT)

### Test Group 1: End Users (5-10 users)
- [ ] Provide UAT instructions
- [ ] Users create real tickets
- [ ] Collect feedback on UI/UX
- [ ] Collect feedback on form clarity
- [ ] Identify any confusion points
- [ ] Document feature requests
- [ ] Fix critical issues
- [ ] Retest after fixes

### Test Group 2: Support Staff (3-5 agents)
- [ ] Provide admin UAT instructions
- [ ] Staff process test tickets
- [ ] Collect feedback on admin interface
- [ ] Collect feedback on workflow
- [ ] Identify missing features
- [ ] Document efficiency improvements
- [ ] Fix critical issues
- [ ] Retest after fixes

### UAT Sign-off
- [ ] All critical bugs fixed
- [ ] All major issues addressed
- [ ] User feedback incorporated
- [ ] Support staff trained
- [ ] Documentation finalized
- [ ] Stakeholder approval obtained

---

## Phase 11: Production Deployment

### Pre-Deployment
- [ ] Backup database
- [ ] Schedule maintenance window
- [ ] Notify users of downtime (if any)
- [ ] Prepare rollback plan
- [ ] Review deployment checklist

### Deployment Steps
- [ ] Stop application (if needed)
- [ ] Run database migration on production
  ```bash
  psql -U prod_user -d bisman_erp_prod -f database/migrations/create_support_tickets_system.sql
  ```
- [ ] Verify migration successful
- [ ] Deploy backend code
- [ ] Deploy frontend code
- [ ] Clear caches
- [ ] Start application
- [ ] Verify health check passes

### Post-Deployment Verification
- [ ] Create test ticket in production
- [ ] Verify email notifications (if enabled)
- [ ] Check error logs (should be empty)
- [ ] Monitor performance metrics
- [ ] Verify user access works
- [ ] Verify admin access works
- [ ] Announce feature to users

### Monitoring Setup
- [ ] Set up error tracking (Sentry, Rollbar, etc.)
- [ ] Set up performance monitoring (New Relic, DataDog, etc.)
- [ ] Set up uptime monitoring
- [ ] Configure alerts (high error rate, slow response time)
- [ ] Set up dashboard for ticket metrics
- [ ] Schedule daily reports

---

## Phase 12: Post-Launch

### Week 1
- [ ] Monitor error logs daily
- [ ] Track ticket creation volume
- [ ] Collect user feedback
- [ ] Address any bugs immediately
- [ ] Update documentation based on feedback
- [ ] Provide extra support to users

### Week 2-4
- [ ] Analyze usage patterns
- [ ] Identify most common issues
- [ ] Optimize based on data
- [ ] Plan Phase 2 features
- [ ] Conduct retrospective with team

### Ongoing
- [ ] Monthly review of ticket metrics
- [ ] Quarterly feature enhancements
- [ ] Regular security audits
- [ ] Database performance tuning
- [ ] Keep documentation updated

---

## Success Metrics

### Technical Metrics
- [ ] Zero critical bugs in production
- [ ] API response time < 500ms (p95)
- [ ] Page load time < 2 seconds
- [ ] Uptime > 99.9%
- [ ] Error rate < 0.1%

### User Metrics
- [ ] 80%+ user adoption within 1 month
- [ ] Average ticket creation time < 3 minutes
- [ ] User satisfaction score > 4.0/5.0
- [ ] Support staff efficiency improved by 20%
- [ ] Average response time < 4 hours

### Business Metrics
- [ ] 50%+ reduction in email support requests
- [ ] Clear audit trail for compliance
- [ ] Improved issue tracking and reporting
- [ ] Faster issue resolution times
- [ ] Better user satisfaction scores

---

## Sign-off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Developer | _____________ | ______ | __________ |
| QA Lead | _____________ | ______ | __________ |
| Product Owner | _____________ | ______ | __________ |
| System Admin | _____________ | ______ | __________ |
| Stakeholder | _____________ | ______ | __________ |

---

**Checklist Version**: 1.0  
**Last Updated**: 2025-01-XX  
**Project**: BISMAN ERP Help & Support Module

