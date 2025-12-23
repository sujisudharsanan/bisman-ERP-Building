/**
 * Clarification Components
 * 
 * Task clarification system - allows cross-user/cross-department
 * clarifications WITHOUT changing task ownership or approval chain.
 * 
 * Visual Theme: Purple (distinct from approval/escalation)
 * 
 * Components:
 * - RequestClarificationModal: Modal for requesting clarification
 * - RespondToClarificationModal: Modal for responding to clarifications
 * - ClarificationList: List view of clarifications for a task
 * - PendingClarificationsBadge: Header badge with count and dropdown
 * - ReadOnlyTaskView: Read-only task view for responders
 */

export { RequestClarificationModal } from './RequestClarificationModal';
export { RespondToClarificationModal } from './RespondToClarificationModal';
export { ClarificationList } from './ClarificationList';
export { PendingClarificationsBadge } from './PendingClarificationsBadge';
export { ReadOnlyTaskView } from './ReadOnlyTaskView';
