# Task Clarification System

## Overview

The Task Clarification System enables cross-user and cross-department clarification requests **WITHOUT changing task ownership, approval chain, or authority**. This feature is designed for situations where the task assignee or approver needs input from someone outside the normal workflow.

## Key Features

### 1. Cross-User/Department Clarification
- Request clarification from any user in the organization
- Target specific departments for broader questions
- Responders get **read-only access** to the task

### 2. SLA Management
- Configurable SLA pause during clarification
- Automatic SLA resume after response
- Tracks total pause time for reporting

### 3. Audit & Compliance
- Full audit trail of all clarification actions
- Integrated with task audit log
- Timestamp tracking for SLA/compliance reporting

### 4. Visual Distinction
- **Purple color theme** for all clarification UI elements
- Distinct from approval (blue/green) and escalation (orange) flows
- Clear "WAITING_FOR_CLARIFICATION" status badge

## Status Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     Normal Task Flow                            │
│  OPEN → ASSIGNED → IN_PROGRESS → IN_REVIEW → COMPLETED         │
└─────────────────────────────────────────────────────────────────┘
                           │
                           ▼ Request Clarification
          ┌────────────────────────────────────┐
          │    WAITING_FOR_CLARIFICATION       │ ◀── Purple indicator
          │    (SLA paused if configured)      │
          └────────────────────────────────────┘
                           │
                           ▼ Clarification Responded
          ┌────────────────────────────────────┐
          │   Returns to Previous Status        │
          │   (SLA resumes automatically)       │
          └────────────────────────────────────┘
```

## API Endpoints

### Create Clarification Request
```
POST /api/clarifications
Body: {
  taskId: number,          // Required
  responderId?: number,    // Target user ID
  responderDepartmentId?: string,  // OR target department
  question: string,        // Required
  pauseSla?: boolean,      // Default: true
  expiryHours?: number,    // Default: 48
  urgency?: 'low' | 'normal' | 'high' | 'critical'
}
```

### Respond to Clarification
```
POST /api/clarifications/:id/respond
Body: {
  response: string,        // Required
  attachments?: Array
}
```

### Cancel Clarification
```
POST /api/clarifications/:id/cancel
Body: {
  reason?: string
}
```

### Get Pending Clarifications
```
GET /api/clarifications/pending?page=1&limit=20
```

### Get Task Clarifications
```
GET /api/clarifications/task/:taskId
```

### Get Clarification Details
```
GET /api/clarifications/:id
```

### Get Clarification Statistics
```
GET /api/clarifications/stats
```

## Database Schema

### task_clarifications
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| task_id | INT | Reference to workflow_tasks |
| requester_id | INT | User who requested clarification |
| responder_id | INT | Target user (nullable) |
| responder_department_id | VARCHAR | Target department (nullable) |
| question | TEXT | Clarification question |
| response | TEXT | Response text (nullable) |
| status | ENUM | pending, responded, expired, cancelled |
| pause_sla | BOOLEAN | Whether SLA is paused |
| sla_paused_at | TIMESTAMP | When SLA was paused |
| sla_resumed_at | TIMESTAMP | When SLA was resumed |
| expiry_hours | INT | Hours before expiry |
| expires_at | TIMESTAMP | When clarification expires |
| urgency | VARCHAR | low, normal, high, critical |
| previous_task_status | VARCHAR | Task status before clarification |

### clarification_audit
| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| clarification_id | UUID | Reference to clarification |
| actor_id | INT | Who performed the action |
| action | VARCHAR | request, respond, cancel, expire |
| old_status | VARCHAR | Previous status |
| new_status | VARCHAR | New status |
| comment | TEXT | Action comment |

### workflow_tasks (added columns)
| Column | Type | Description |
|--------|------|-------------|
| active_clarification_count | INT | Count of pending clarifications |
| max_concurrent_clarifications | INT | Limit (default: 3) |
| is_waiting_for_clarification | BOOLEAN | Quick flag for filtering |
| total_clarification_pause_hours | DECIMAL | Total SLA pause time |

## Frontend Components

### ClarificationList
Displays all clarifications for a task with timeline view.

```tsx
import { ClarificationList } from '@/components/tasks/clarifications';

<ClarificationList
  taskId={123}
  currentUserId={userId}
  canRequestClarification={true}
  onRequestClarification={() => setShowModal(true)}
/>
```

### RequestClarificationModal
Modal for requesting clarification.

```tsx
import { RequestClarificationModal } from '@/components/tasks/clarifications';

<RequestClarificationModal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  taskId={taskId}
  taskTitle="Task Title"
  availableUsers={userList}
  availableDepartments={deptList}
/>
```

### RespondToClarificationModal
Modal for responding to clarifications.

```tsx
import { RespondToClarificationModal } from '@/components/tasks/clarifications';

<RespondToClarificationModal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  clarificationId={clarificationId}
/>
```

### PendingClarificationsBadge
Header badge showing pending clarification count.

```tsx
import { PendingClarificationsBadge } from '@/components/tasks/clarifications';

<PendingClarificationsBadge showLabel={true} />
```

## React Hooks

### usePendingClarifications
```tsx
const { data, isLoading } = usePendingClarifications({ page: 1, limit: 20 });
```

### useTaskClarifications
```tsx
const { data } = useTaskClarifications(taskId, { status: 'pending' });
```

### useRequestClarification
```tsx
const { mutate } = useRequestClarification();
mutate({ taskId, responderId, question });
```

### useRespondToClarification
```tsx
const { mutate } = useRespondToClarification();
mutate({ clarificationId, response });
```

## Business Rules

1. **Who can request clarification:**
   - Task creator
   - Task assignee
   - Task approver

2. **Who can respond:**
   - Specified user (responderId)
   - Any member of specified department

3. **Concurrent limits:**
   - Default max 3 concurrent clarifications per task
   - Configurable per task

4. **Expiry:**
   - Default 48 hours
   - Configurable per request
   - Expired clarifications auto-resume task

5. **SLA behavior:**
   - Pause is optional (default: true)
   - Pause time is tracked and reported
   - SLA resumes immediately on response/cancel/expire

## Socket Events

### task:clarification_requested
Emitted when a clarification is requested.

### clarification:new
Sent to the responder when they receive a new request.

### task:clarification_responded
Emitted when a clarification is answered.

### clarification:response
Sent to the requester when their clarification is answered.

## Scheduled Jobs

### clarificationExpiryJob.js
Expires overdue clarifications. Run hourly via cron:
```bash
0 * * * * cd /path/to/my-backend && node jobs/clarificationExpiryJob.js
```

## Migration

Run the migration to create the clarification tables:
```bash
cd my-backend
npx knex migrate:latest --knexfile database/knexfile.js
```

## UI/UX Guidelines

### Color Scheme
- **Purple** (#7C3AED) for all clarification-related UI
- Distinct from:
  - Blue (approval pending)
  - Green (approved/completed)
  - Orange (escalated)
  - Red (rejected/blocked)

### Status Badge
```tsx
<Badge className="bg-purple-100 text-purple-700">
  <HelpCircle className="w-3 h-3 mr-1" />
  Awaiting Clarification
</Badge>
```

### Read-Only Indicator
Always show a clear "Read-Only" banner when displaying task details to clarification responders.

## Security Considerations

1. **No permission escalation:** Responders cannot modify the task
2. **Tenant isolation:** All queries filtered by tenant_id
3. **Audit logging:** All actions logged for compliance
4. **Authorization checks:** Only task participants can request clarification
