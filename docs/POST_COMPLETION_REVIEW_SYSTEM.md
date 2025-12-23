# Post-Completion Review System

## Overview

The Post-Completion Review System allows users to forward **COMPLETED** tasks to other users or departments for review, similar to forwarding an old email. This feature enables knowledge sharing, audit compliance, and confirmation requests **WITHOUT reopening the task or changing its status**.

## Key Principles

1. **Task Status Never Changes** - Tasks remain COMPLETED
2. **No Approval Chain Reopened** - No approve/reject functionality
3. **Read-Only Access** - Reviewers can only view, comment, and acknowledge
4. **Non-Blocking** - Reviews are optional and don't block workflows
5. **Fully Audited** - Complete audit trail for compliance

## Review Purposes

| Purpose | Description | Expected Action |
|---------|-------------|-----------------|
| **FYI** | For Information Only | No action required, just acknowledge |
| **CONFIRMATION** | Request Confirmation | Confirm understanding with a note |
| **AUDIT** | Audit/Compliance Review | Review for compliance documentation |
| **KNOWLEDGE** | Knowledge Sharing | Reference for training/learning |

## Visual Design

### Color Scheme
- **Yellow/Amber** (`#F59E0B`) for all review-related UI
- Distinct from:
  - Purple (clarification)
  - Blue (approval pending)
  - Green (completed)
  - Red (rejected/blocked)

### Status Badge
When a COMPLETED task has pending reviews, it shows a special yellow badge:
```tsx
<Badge className="bg-amber-100 text-amber-700">
  <Eye className="w-3 h-3 mr-1" />
  Completed • Under Review
</Badge>
```

## API Endpoints

### Send for Review
```http
POST /api/reviews
Authorization: Bearer <token>
Content-Type: application/json

{
  "taskId": 123,
  "reviewerId": 456,          // OR reviewerDepartmentId
  "reviewerDepartmentId": "dept_sales",
  "purpose": "FYI",           // FYI, CONFIRMATION, AUDIT, KNOWLEDGE
  "note": "Please review this completed work",
  "expiryDays": 7,            // Optional
  "priority": "normal"        // low, normal, high
}
```

### Acknowledge Review
```http
POST /api/reviews/:id/acknowledge
Authorization: Bearer <token>
Content-Type: application/json

{
  "acknowledgmentNote": "Reviewed and understood"
}
```

### Add Comment
```http
POST /api/reviews/:id/comment
Authorization: Bearer <token>
Content-Type: application/json

{
  "content": "Great work on this task!",
  "parentId": null           // Optional, for threading
}
```

### Cancel Review
```http
POST /api/reviews/:id/cancel
Authorization: Bearer <token>
Content-Type: application/json

{
  "reason": "Sent to wrong person"
}
```

### Get Pending Reviews
```http
GET /api/reviews/pending?page=1&limit=20
Authorization: Bearer <token>
```

### Get Sent Reviews
```http
GET /api/reviews/sent?page=1&limit=20&status=PENDING
Authorization: Bearer <token>
```

### Get Task Reviews
```http
GET /api/reviews/task/:taskId
Authorization: Bearer <token>
```

### Get Review Details
```http
GET /api/reviews/:id
Authorization: Bearer <token>
```

### Get Review Audit Trail
```http
GET /api/reviews/:id/audit
Authorization: Bearer <token>
```

### Get Review Statistics
```http
GET /api/reviews/stats
Authorization: Bearer <token>
```

## Database Schema

### task_reviews
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| task_id | INT | Reference to workflow_tasks |
| sender_id | INT | User who sent for review |
| reviewer_id | INT | Target user (nullable) |
| reviewer_department_id | VARCHAR | Target department (nullable) |
| purpose | ENUM | FYI, CONFIRMATION, AUDIT, KNOWLEDGE |
| note | TEXT | Sender's note |
| attachments | JSONB | Additional attachments |
| status | ENUM | PENDING, ACKNOWLEDGED, COMMENTED, EXPIRED, CANCELLED |
| acknowledgment_note | TEXT | Reviewer's acknowledgment note |
| acknowledged_at | TIMESTAMP | When acknowledged |
| acknowledged_by | INT | Who acknowledged |
| expiry_days | INT | Days before expiry |
| expires_at | TIMESTAMP | Expiry timestamp |
| priority | VARCHAR | low, normal, high |
| tenant_id | VARCHAR | Tenant isolation |

### review_comments
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| review_id | UUID | Reference to task_reviews |
| author_id | INT | Comment author |
| content | TEXT | Comment text |
| attachments | JSONB | Comment attachments |
| parent_id | UUID | Parent comment (threading) |
| tenant_id | VARCHAR | Tenant isolation |

### review_audit
| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| review_id | UUID | Reference to task_reviews |
| actor_id | INT | Who performed action |
| action | VARCHAR | send, view, comment, acknowledge, cancel, expire |
| old_status | VARCHAR | Previous status |
| new_status | VARCHAR | New status |
| comment | TEXT | Action comment |
| metadata | JSONB | Additional data |

### workflow_tasks (added columns)
| Column | Type | Description |
|--------|------|-------------|
| active_review_count | INT | Count of pending reviews |
| has_pending_review | BOOLEAN | Quick flag for filtering |
| total_review_count | INT | Total reviews ever sent |

## Frontend Components

### SendForReviewModal
```tsx
import { SendForReviewModal } from '@/components/tasks/reviews';

<SendForReviewModal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  taskId={123}
  taskTitle="Task Title"
  availableUsers={userList}
  availableDepartments={deptList}
/>
```

### ReviewList
```tsx
import { ReviewList } from '@/components/tasks/reviews';

<ReviewList
  taskId={123}
  currentUserId={userId}
  canSendForReview={true}
  onSendForReview={() => setShowModal(true)}
/>
```

### PendingReviewsBadge
```tsx
import { PendingReviewsBadge } from '@/components/tasks/reviews';

// In header/navigation
<PendingReviewsBadge showLabel={true} />
```

### ReviewerTaskView
```tsx
import { ReviewerTaskView } from '@/components/tasks/reviews';

// Read-only task view for reviewers
<ReviewerTaskView review={review} />
```

### AcknowledgeReviewModal
```tsx
import { AcknowledgeReviewModal } from '@/components/tasks/reviews';

<AcknowledgeReviewModal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  review={review}
/>
```

## React Hooks

### usePendingReviews
```tsx
const { data, isLoading } = usePendingReviews({ page: 1, limit: 20 });
```

### useSentReviews
```tsx
const { data } = useSentReviews({ page: 1, limit: 20, status: 'PENDING' });
```

### useTaskReviews
```tsx
const { data } = useTaskReviews(taskId);
```

### useReviewDetails
```tsx
const { data } = useReviewDetails(reviewId);
```

### useSendForReview
```tsx
const { mutate } = useSendForReview();
mutate({ taskId, reviewerId, purpose: 'FYI', note: '...' });
```

### useAcknowledgeReview
```tsx
const { mutate } = useAcknowledgeReview();
mutate({ reviewId, acknowledgmentNote: '...' });
```

## Business Rules

1. **Who can send for review:**
   - Task creator
   - Task assignee
   - Task approver

2. **Who can acknowledge:**
   - Specified reviewer
   - Any member of specified department

3. **Who can comment:**
   - Sender
   - Reviewer(s)

4. **Who can cancel:**
   - Only the sender

5. **Expiry:**
   - Optional (default: no expiry)
   - Configurable per request
   - Expired reviews auto-update status

## Socket Events

### review:new
Sent to reviewer when they receive a new review request.

### task:review_requested
Sent to task room when review is requested.

### review:acknowledged
Sent to sender when review is acknowledged.

### review:comment_added
Sent to review participants when comment added.

### review:cancelled
Sent to reviewer when review is cancelled.

## Scheduled Jobs

### reviewExpiryJob.js
Expires overdue reviews. Run hourly via cron:
```bash
0 * * * * cd /path/to/my-backend && node jobs/reviewExpiryJob.js
```

## Pages

### Reviews List
`/tasks/reviews` - Main page showing pending reviews and sent reviews

### Review Detail
`/tasks/reviews/:id` - Full review details with task info, comments, and audit

## Migration

Run the migration to create review tables:
```bash
cd my-backend
npx knex migrate:latest --knexfile database/knexfile.js
```

## UI/UX Guidelines

### "Send for Review" Button
- Only visible on COMPLETED tasks
- Yellow/amber colored
- Located in task actions area

### Reviewer View
- Clear "Read-Only" banner at top
- No edit/approve/reject buttons
- Only acknowledge and comment actions
- Yellow border on review context card

### Status Badge Behavior
| Task Status | Has Pending Review | Badge Display |
|-------------|-------------------|---------------|
| COMPLETED | No | Green "Completed" |
| COMPLETED | Yes | Yellow "Completed • Under Review" |

## Security Considerations

1. **No permission escalation** - Reviewers cannot modify tasks
2. **Tenant isolation** - All queries filtered by tenant_id
3. **Audit logging** - All actions logged
4. **Authorization checks** - Only task participants can send for review
5. **No workflow changes** - Cannot change task status, assignee, or approval

## Comparison with Other Features

| Feature | Purpose | Task Status | Actions Available |
|---------|---------|-------------|-------------------|
| **Approval** | Get permission | Changes | Approve/Reject |
| **Escalation** | Raise priority | May change | Escalate/De-escalate |
| **Clarification** | Get input | Pauses (optional) | Ask/Answer |
| **Review** | Knowledge sharing | Never changes | Acknowledge/Comment |
