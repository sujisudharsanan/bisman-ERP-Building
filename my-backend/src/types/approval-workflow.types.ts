/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * BISMAN ERP - Approval Workflow Engine Types
 * 
 * Comprehensive TypeScript types for the stage-based approval workflow system.
 * These types match the database schema and provide type safety throughout
 * the application.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════════════════
// ENUMS - Match database enums exactly
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Status of an individual approval stage within a workflow instance
 */
export type ApprovalStageStatus =
  | 'pending'       // Waiting to be activated
  | 'active'        // Currently awaiting approval
  | 'approved'      // Stage approved
  | 'rejected'      // Stage rejected
  | 'skipped'       // Stage skipped (fallback applied)
  | 'escalated'     // Escalated to higher authority
  | 'auto_approved'; // Auto-approved by system

/**
 * Status of an entire approval workflow instance
 */
export type ApprovalInstanceStatus =
  | 'draft'        // Not yet submitted
  | 'in_progress'  // Workflow is active
  | 'completed'    // All stages completed successfully
  | 'rejected'     // Workflow rejected at some stage
  | 'cancelled'    // Cancelled by initiator
  | 'expired';     // Workflow expired due to timeout

/**
 * How an approver is assigned to a stage
 * This is the core of the flexible assignment system
 */
export type StageAssigneeType =
  | 'specific_user'     // Assigned to a specific user by ID
  | 'role'              // Assigned to anyone with a specific role
  | 'department_head'   // Assigned to the department head
  | 'initiator_manager' // Assigned to the initiator's manager
  | 'dynamic';          // Determined at runtime by custom logic

/**
 * Fallback strategies when no approver is found
 * These ensure workflows NEVER get blocked
 */
export type FallbackStrategy =
  | 'auto_assign_admin'       // Assign to Client/Tenant Admin
  | 'auto_approve'            // Automatically approve the stage
  | 'escalate_to_owner'       // Escalate to business owner
  | 'escalate_to_super_admin' // Escalate to Super Admin
  | 'skip_stage'              // Skip this stage entirely
  | 'block_and_notify'        // Block and notify admins (last resort)
  | 'assign_to_initiator';    // Assign back to initiator (self-service)

/**
 * Types of entities that can go through approval workflows
 */
export type WorkflowEntityType =
  | 'payment_request'
  | 'purchase_order'
  | 'leave_request'
  | 'expense_claim'
  | 'vendor_onboarding'
  | 'invoice_approval'
  | 'contract_approval'
  | 'budget_request'
  | 'asset_disposal'
  | 'custom';

/**
 * Notification types for approval events
 */
export type ApprovalNotificationType =
  | 'approval_required'
  | 'approved'
  | 'rejected'
  | 'escalated'
  | 'reminder'
  | 'delegated'
  | 'completed'
  | 'cancelled'
  | 'expired';

/**
 * Notification delivery channels
 */
export type NotificationChannel = 'in_app' | 'email' | 'sms' | 'push';

/**
 * Delivery status for notifications
 */
export type DeliveryStatus = 'pending' | 'sent' | 'delivered' | 'failed';

// ═══════════════════════════════════════════════════════════════════════════════
// INTERFACES - Core data structures
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Workflow Template - Defines the structure of an approval workflow
 * This is the "blueprint" that instances are created from
 */
export interface ApprovalWorkflowTemplate {
  id: string;
  tenantId: string;
  
  // Template identity
  name: string;
  code: string;  // Unique code like 'PAYMENT_REQUEST_WORKFLOW'
  description?: string;
  entityType: WorkflowEntityType;
  
  // Versioning
  version: number;
  isActive: boolean;
  isDefault: boolean;  // Default workflow for this entity type
  
  // Configuration
  allowParallelStages: boolean;
  requireAllApprovals: boolean;
  maxRejectionCount: number;
  expiryDays: number;
  
  // Metadata
  createdBy: string;
  createdAt: Date;
  updatedBy?: string;
  updatedAt?: Date;
  
  // Relations (when loaded)
  stages?: ApprovalWorkflowStage[];
}

/**
 * Condition expression for conditional stages
 * Used to determine if a stage should be activated
 */
export interface StageConditionExpression {
  // Amount-based conditions
  amount_gte?: number;  // Amount >= value
  amount_lte?: number;  // Amount <= value
  amount_eq?: number;   // Amount == value
  
  // Field-based conditions
  field?: string;       // Field name to check
  operator?: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'in';
  value?: string | number | boolean | null;  // Value to compare against
  
  // Logical combinations
  and?: StageConditionExpression[];
  or?: StageConditionExpression[];
}

/**
 * Assignment condition for dynamic stage assignment
 */
export interface AssignmentCondition {
  // Role-based
  preferredRoles?: string[];  // Try these roles in order
  
  // Department-based
  department?: string;
  
  // Custom function reference
  customResolver?: string;  // Name of custom resolver function
  
  // Fallback chain
  fallbackChain?: {
    type: StageAssigneeType;
    value?: string;  // User ID or role name
  }[];
}

/**
 * Workflow Stage - Individual step within a workflow template
 */
export interface ApprovalWorkflowStage {
  id: string;
  workflowTemplateId: string;
  
  // Stage identity
  name: string;
  code: string;  // e.g., 'BUSINESS_APPROVAL', 'FINANCE_VALIDATION'
  description?: string;
  stageOrder: number;
  
  // Assignment configuration
  assigneeType: StageAssigneeType;
  assignedUserId?: string;   // If assigneeType = 'specific_user'
  assignedRole?: string;     // If assigneeType = 'role'
  assignmentCondition?: AssignmentCondition;
  
  // Fallback configuration (CRITICAL)
  fallbackStrategy: FallbackStrategy;
  fallbackUserId?: string;
  fallbackRole?: string;
  secondaryFallback?: FallbackStrategy;
  
  // Stage rules
  isOptional: boolean;
  isConditional: boolean;
  conditionExpression?: StageConditionExpression;
  allowSelfApproval: boolean;
  requireComment: boolean;
  
  // Thresholds
  minAmount?: number;
  maxAmount?: number;
  
  // SLA
  slaHours: number;
  escalationHours: number;
  
  // Metadata
  createdAt: Date;
  updatedAt?: Date;
}

/**
 * Approval Instance - Runtime instance of a workflow
 * Created when someone initiates an approval request
 */
export interface ApprovalInstance {
  id: string;
  tenantId: string;
  workflowTemplateId: string;
  
  // What is being approved
  entityType: WorkflowEntityType;
  entityId: string;
  entityReference?: string;  // Human-readable reference
  
  // Instance state
  status: ApprovalInstanceStatus;
  currentStageId?: string;
  currentStageOrder: number;
  
  // Request context
  requestedAmount?: number;
  requestMetadata?: Record<string, unknown>;
  
  // Tracking
  initiatedBy: string;
  initiatedAt: Date;
  completedAt?: Date;
  completedBy?: string;
  
  // Rejection tracking
  rejectionCount: number;
  lastRejectionReason?: string;
  lastRejectedBy?: string;
  lastRejectedAt?: Date;
  
  // Expiry
  expiresAt?: Date;
  
  // Metadata
  createdAt: Date;
  updatedAt?: Date;
  
  // Relations (when loaded)
  template?: ApprovalWorkflowTemplate;
  stageInstances?: ApprovalStageInstance[];
  currentStage?: ApprovalStageInstance;
  auditLog?: ApprovalAuditLogEntry[];
}

/**
 * Stage Instance - Runtime state of a stage within an approval instance
 */
export interface ApprovalStageInstance {
  id: string;
  approvalInstanceId: string;
  workflowStageId: string;
  
  // Stage state
  status: ApprovalStageStatus;
  stageOrder: number;
  
  // Resolved approver
  resolvedApproverId?: string;
  resolvedVia?: StageAssigneeType;
  fallbackApplied?: FallbackStrategy;
  
  // Action tracking
  actionedBy?: string;
  actionedAt?: Date;
  actionComment?: string;
  
  // SLA tracking
  activatedAt?: Date;
  dueAt?: Date;
  escalatedAt?: Date;
  escalatedTo?: string;
  
  // Attempt tracking
  attemptNumber: number;
  
  // Metadata
  createdAt: Date;
  updatedAt?: Date;
  
  // Relations (when loaded)
  stage?: ApprovalWorkflowStage;
  approver?: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

/**
 * Audit Log Entry - Record of an approval action
 */
export interface ApprovalAuditLogEntry {
  id: string;
  tenantId: string;
  approvalInstanceId: string;
  stageInstanceId?: string;
  
  // Action details
  action: string;
  actionCategory: 'workflow' | 'stage' | 'system';
  
  // Actor
  performedBy?: string;
  performedByName?: string;
  performedByRole?: string;
  isSystemAction: boolean;
  
  // Context
  previousStatus?: string;
  newStatus?: string;
  comment?: string;
  metadata?: Record<string, unknown>;
  
  // Timing
  performedAt: Date;
}

/**
 * Approval Delegation - Temporary transfer of approval authority
 */
export interface ApprovalDelegation {
  id: string;
  tenantId: string;
  
  // Delegation details
  delegatorId: string;
  delegateId: string;
  
  // Scope
  workflowTemplateId?: string;  // NULL = all workflows
  stageId?: string;              // NULL = all stages
  entityType?: WorkflowEntityType;
  maxAmount?: number;
  
  // Validity
  validFrom: Date;
  validUntil: Date;
  isActive: boolean;
  
  // Metadata
  reason?: string;
  createdAt: Date;
  createdBy: string;
  revokedAt?: Date;
  revokedBy?: string;
}

/**
 * Approval Notification - Notification for approval events
 */
export interface ApprovalNotification {
  id: string;
  tenantId: string;
  approvalInstanceId: string;
  stageInstanceId?: string;
  
  // Notification details
  notificationType: ApprovalNotificationType;
  recipientId: string;
  recipientEmail?: string;
  
  // Content
  title: string;
  message: string;
  actionUrl?: string;
  
  // Delivery tracking
  channel: NotificationChannel;
  sentAt?: Date;
  readAt?: Date;
  deliveryStatus: DeliveryStatus;
  retryCount: number;
  
  // Metadata
  createdAt: Date;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SERVICE INTERFACES - For the approval workflow engine
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Result of resolving an approver for a stage
 */
export interface ResolvedApprover {
  userId: string;
  userName: string;
  userEmail: string;
  userRole: string;
  resolvedVia: StageAssigneeType;
  fallbackApplied?: FallbackStrategy;
  delegatedFrom?: string;  // If this is a delegate
}

/**
 * Options for initiating a new approval workflow
 */
export interface InitiateWorkflowOptions {
  tenantId: string;
  entityType: WorkflowEntityType;
  entityId: string;
  entityReference?: string;
  requestedAmount?: number;
  requestMetadata?: Record<string, unknown>;
  initiatedBy: string;
  workflowTemplateId?: string;  // If not provided, uses default for entity type
}

/**
 * Options for approving/rejecting a stage
 */
export interface StageActionOptions {
  stageInstanceId: string;
  action: 'approve' | 'reject';
  actorId: string;
  comment?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Result of advancing a workflow stage
 */
export interface AdvanceStageResult {
  success: boolean;
  instanceId: string;
  previousStageId?: string;
  nextStageId?: string;
  workflowCompleted: boolean;
  workflowRejected: boolean;
  nextApprover?: ResolvedApprover;
  error?: string;
}

/**
 * Pending approval item for a user
 */
export interface PendingApproval {
  instanceId: string;
  stageInstanceId: string;
  entityType: WorkflowEntityType;
  entityId: string;
  entityReference?: string;
  stageName: string;
  stageCode: string;
  requestedAmount?: number;
  initiatedBy: string;
  initiatedByName?: string;
  initiatedAt: Date;
  dueAt?: Date;
  isOverdue: boolean;
  isEscalated: boolean;
}

/**
 * Workflow statistics for dashboard
 */
export interface WorkflowStats {
  pending: number;
  approved: number;
  rejected: number;
  completed: number;
  averageApprovalTimeHours: number;
  overdueCount: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EVENT TYPES - For notifications and hooks
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Base approval event
 */
export interface ApprovalEvent {
  type: string;
  tenantId: string;
  instanceId: string;
  entityType: WorkflowEntityType;
  entityId: string;
  timestamp: Date;
  actor?: {
    id: string;
    name: string;
    role: string;
  };
}

/**
 * Workflow initiated event
 */
export interface WorkflowInitiatedEvent extends ApprovalEvent {
  type: 'workflow_initiated';
  firstApprover: ResolvedApprover;
}

/**
 * Stage approved event
 */
export interface StageApprovedEvent extends ApprovalEvent {
  type: 'stage_approved';
  stageId: string;
  stageName: string;
  comment?: string;
  nextApprover?: ResolvedApprover;
  workflowCompleted: boolean;
}

/**
 * Stage rejected event
 */
export interface StageRejectedEvent extends ApprovalEvent {
  type: 'stage_rejected';
  stageId: string;
  stageName: string;
  reason: string;
  rejectionCount: number;
  workflowRejected: boolean;
}

/**
 * Workflow completed event
 */
export interface WorkflowCompletedEvent extends ApprovalEvent {
  type: 'workflow_completed';
  totalStages: number;
  totalTimeHours: number;
}

/**
 * Escalation event
 */
export interface EscalationEvent extends ApprovalEvent {
  type: 'escalated';
  stageId: string;
  stageName: string;
  escalatedFrom?: string;
  escalatedTo: ResolvedApprover;
  reason: 'sla_breach' | 'no_approver' | 'manual';
}

/**
 * Union type for all approval events
 */
export type ApprovalEventUnion =
  | WorkflowInitiatedEvent
  | StageApprovedEvent
  | StageRejectedEvent
  | WorkflowCompletedEvent
  | EscalationEvent;

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Payment request workflow stage codes
 * Standard 6-stage payment request flow
 */
export const PAYMENT_REQUEST_STAGES = {
  INITIATION: 'INITIATION',
  BUSINESS_APPROVAL: 'BUSINESS_APPROVAL',
  FINANCE_VALIDATION: 'FINANCE_VALIDATION',
  PAYMENT_AUTHORIZATION: 'PAYMENT_AUTHORIZATION',
  PAYMENT_EXECUTION: 'PAYMENT_EXECUTION',
  COMPLETION: 'COMPLETION',
} as const;

export type PaymentRequestStageCode = typeof PAYMENT_REQUEST_STAGES[keyof typeof PAYMENT_REQUEST_STAGES];

/**
 * Default SLA configuration
 */
export const DEFAULT_SLA_CONFIG = {
  DEFAULT_SLA_HOURS: 24,
  DEFAULT_ESCALATION_HOURS: 48,
  MAX_REJECTION_COUNT: 3,
  WORKFLOW_EXPIRY_DAYS: 30,
  REMINDER_BEFORE_DUE_HOURS: 4,
} as const;

/**
 * Fallback priority order (tried in sequence)
 */
export const FALLBACK_PRIORITY: FallbackStrategy[] = [
  'auto_assign_admin',
  'escalate_to_owner',
  'escalate_to_super_admin',
  'skip_stage',
  'auto_approve',
  'block_and_notify',
];
