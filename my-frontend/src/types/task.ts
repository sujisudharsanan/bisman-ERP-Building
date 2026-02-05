/**
 * Task Management System Types
 * Integrated with Chat UI
 */

// ============================================
// ENUMS
// ============================================

export enum TaskStatus {
  DRAFT = 'DRAFT',
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  IN_REVIEW = 'IN_REVIEW',
  BLOCKED = 'BLOCKED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  ARCHIVED = 'ARCHIVED',
  WAITING_FOR_CLARIFICATION = 'WAITING_FOR_CLARIFICATION',
}

export enum TaskPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
  CRITICAL = 'CRITICAL',
}

export enum ApprovalStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  NOT_REQUIRED = 'NOT_REQUIRED',
}

export enum MessageType {
  TEXT = 'TEXT',
  SYSTEM = 'SYSTEM',
  STATUS_CHANGE = 'STATUS_CHANGE',
  ASSIGNEE_CHANGE = 'ASSIGNEE_CHANGE',
  APPROVAL_REQUEST = 'APPROVAL_REQUEST',
  APPROVAL_RESPONSE = 'APPROVAL_RESPONSE',
}

export enum ParticipantRole {
  VIEWER = 'VIEWER',
  COLLABORATOR = 'COLLABORATOR',
  REVIEWER = 'REVIEWER',
  APPROVER = 'APPROVER',
}

export enum DependencyType {
  BLOCKS = 'BLOCKS',
  BLOCKED_BY = 'BLOCKED_BY',
  RELATES_TO = 'RELATES_TO',
  DUPLICATES = 'DUPLICATES',
  PARENT = 'PARENT',
  CHILD = 'CHILD',
}

// ============================================
// USER TYPES
// ============================================

export interface TaskUser {
  id: number;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  roleName?: string;
  department?: string;
  /** Pre-formatted display label: "Name • U-ID" - use this in UI */
  displayLabel?: string;
}

// ============================================
// TASK TYPES
// ============================================

export interface Task {
  id: number;
  unique_id?: string;        // Human-readable unique ID (e.g., TSK-20251207-00001)
  serialNumber?: string;     // Alternative serial number for task lookup
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  /** Pre-formatted display label: "Title • TSK-ID" - use this in UI */
  displayLabel?: string;
  
  // User relationships
  creatorId: number;
  assigneeId: number;
  approverId?: number | null;
  
  // User details (populated from joins)
  creator?: TaskUser;
  assignee?: TaskUser;
  approver?: TaskUser | null;
  
  // Approval hierarchy
  requiresApproval: boolean;
  approvalStatus: ApprovalStatus;
  approvedAt?: string | null;
  approvedBy?: number | null;
  
  // Task metadata
  dueDate?: string | null;
  startDate?: string | null;
  completedAt?: string | null;
  archivedAt?: string | null;
  
  // Tracking
  progress: number;
  estimatedHours?: number | null;
  actualHours?: number | null;
  
  // Organization context
  organizationId?: number | null;
  departmentId?: number | null;
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
  
  // Aggregated counts
  messageCount?: number;
  attachmentCount?: number;
  participantCount?: number;
  
  // Related data (when expanded)
  messages?: TaskMessage[];
  attachments?: TaskAttachment[];
  participants?: TaskParticipant[];
}

// ============================================
// TASK MESSAGE TYPES
// ============================================

export interface TaskMessage {
  id: number;
  taskId: number;
  senderId: number;
  messageText: string;
  messageType: MessageType;
  
  // Message metadata
  isSystemMessage: boolean;
  isEdited: boolean;
  editedAt?: string | null;
  
  // Read receipts
  readBy: number[];
  readAt?: string | null;
  
  // Timestamp
  createdAt: string;
  
  // Populated data
  sender?: TaskUser;
  attachments?: TaskAttachment[];
}

// ============================================
// ATTACHMENT TYPES
// ============================================

export interface TaskAttachment {
  id: number;
  taskId: number;
  messageId?: number | null;
  
  // File information
  fileName: string;
  fileUrl: string;
  fileType?: string;
  fileSize?: number;
  
  // Upload metadata
  uploadedBy: number;
  uploadedAt: string;
  
  // Storage metadata
  storageProvider: string;
  storageKey?: string;
  
  // Populated data
  uploader?: TaskUser;
}

// ============================================
// PARTICIPANT TYPES
// ============================================

export interface TaskParticipant {
  id: number;
  taskId: number;
  userId: number;
  role: ParticipantRole;
  addedBy: number;
  addedAt: string;
  
  // Permissions
  canEdit: boolean;
  canComment: boolean;
  canApprove: boolean;
  
  // Populated data
  user?: TaskUser;
}

// ============================================
// HISTORY TYPES
// ============================================

export interface TaskHistory {
  id: number;
  taskId: number;
  userId: number;
  action: string;
  
  // Change tracking
  fieldChanged?: string;
  oldValue?: string;
  newValue?: string;
  
  // Additional context
  notes?: string;
  
  // Timestamp
  createdAt: string;
  
  // Populated data
  user?: TaskUser;
}

// ============================================
// DEPENDENCY TYPES
// ============================================

export interface TaskDependency {
  id: number;
  taskId: number;
  dependsOnTaskId: number;
  dependencyType: DependencyType;
  createdAt: string;
  
  // Populated data
  dependsOnTask?: Task;
}

// ============================================
// TEMPLATE TYPES
// ============================================

export interface TaskTemplate {
  id: number;
  name: string;
  description?: string;
  defaultTitle?: string;
  defaultContent?: string;
  defaultPriority: TaskPriority;
  defaultEstimatedHours?: number;
  
  createdBy: number;
  organizationId?: number;
  isActive: boolean;
  
  createdAt: string;
  updatedAt: string;
}

// ============================================
// CUSTOM FIELD & RECURRING TYPES
// ============================================

export interface CustomField {
  id: string;           // Unique identifier for the field
  label: string;        // Field heading/label
  type: 'text' | 'number' | 'date' | 'select' | 'textarea' | 'currency';
  value: string;        // Field value
  required?: boolean;   // Is field required
  options?: string[];   // Options for select type
  placeholder?: string; // Placeholder text
}

export enum RecurringFrequency {
  NONE = 'NONE',
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  BIWEEKLY = 'BIWEEKLY',
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
  YEARLY = 'YEARLY',
}

export interface RecurringConfig {
  frequency: RecurringFrequency;
  startDate: string;               // When to start recurring
  endDate?: string;                // Optional end date
  dayOfWeek?: number;              // 0-6 for weekly (Sunday = 0)
  dayOfMonth?: number;             // 1-31 for monthly
  time?: string;                   // HH:MM format for task creation time
  maxOccurrences?: number;         // Maximum number of occurrences
  autoAssign?: boolean;            // Auto-assign to same assignee
  isExpense?: boolean;             // Mark as expense task
  expenseAmount?: number;          // Amount if it's an expense
  expenseCategory?: string;        // Category of expense
}

// ============================================
// FORM & INPUT TYPES
// ============================================

// Payment Request data for task creation
export interface PaymentRequestData {
  amount: number;
  currency: string;
  category?: string;
  invoiceNumber?: string;
  beneficiaryName?: string;
  accountNumber?: string;
  bankName?: string;
  notes?: string;
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  assigneeId: string;  // UUID string
  assigneeIds?: string[];  // Multiple assignees for collaborative tasks (UUID strings)
  approverId?: string;  // UUID string
  priority?: TaskPriority;
  dueDate?: string;
  estimatedHours?: number;
  requiresApproval?: boolean;
  attachments?: File[];
  organizationId?: number;
  departmentId?: number;
  tags?: string[];
  customFields?: CustomField[];
  recurring?: RecurringConfig;
  // Payment request specific
  taskType?: 'TASK' | 'PAYMENT_REQUEST';
  paymentRequest?: PaymentRequestData;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assigneeId?: string;  // UUID string
  approverId?: string;  // UUID string
  dueDate?: string;
  progress?: number;
  estimatedHours?: number;
  actualHours?: number;
}

export interface CreateMessageInput {
  taskId: number;
  messageText: string;
  messageType?: MessageType;
  attachments?: File[];
}

export interface TaskFilterOptions {
  status?: TaskStatus[];
  priority?: TaskPriority[];
  assigneeId?: string;  // UUID string
  creatorId?: string;  // UUID string
  approverId?: string;  // UUID string
  dueDateFrom?: string;
  dueDateTo?: string;
  searchQuery?: string;
  organizationId?: number;
  departmentId?: number;
}

// ============================================
// RESPONSE TYPES
// ============================================

export interface TaskResponse {
  success: boolean;
  data?: Task;
  message?: string;
  error?: string;
}

export interface TaskListResponse {
  success: boolean;
  data?: Task[];
  total?: number;
  page?: number;
  pageSize?: number;
  message?: string;
  error?: string;
}

export interface TaskMessageResponse {
  success: boolean;
  data?: TaskMessage;
  message?: string;
  error?: string;
}

export interface TaskMessagesResponse {
  success: boolean;
  data?: TaskMessage[];
  total?: number;
  message?: string;
  error?: string;
}

export interface DuplicateTaskWarning {
  isDuplicate: boolean;
  existingTask?: Task;
  similarity?: number;
  message?: string;
}

// ============================================
// DASHBOARD & ANALYTICS TYPES
// ============================================

export interface TaskDashboardStats {
  draftCount: number;
  openCount: number;
  inProgressCount: number;
  reviewCount: number;
  blockedCount: number;
  completedCount: number;
  overdueCount: number;
  totalTasks: number;
  completionRate: number;
}

export interface TasksByStatus {
  [TaskStatus.DRAFT]: Task[];
  [TaskStatus.OPEN]: Task[];
  [TaskStatus.IN_PROGRESS]: Task[];
  [TaskStatus.IN_REVIEW]: Task[];
  [TaskStatus.BLOCKED]: Task[];
  [TaskStatus.COMPLETED]: Task[];
  [TaskStatus.CANCELLED]?: Task[];
  [TaskStatus.ARCHIVED]?: Task[];
}

// ============================================
// SIDEBAR & UI TYPES
// ============================================

export interface TaskSidebarItem {
  task: Task;
  unreadCount: number;
  lastMessage?: TaskMessage;
  isActive: boolean;
}

export interface ChatSidebarSection {
  users: Array<{
    id: number;
    name: string;
    avatar?: string;
    isOnline: boolean;
    unreadCount: number;
  }>;
  tasks: TaskSidebarItem[];
}

// ============================================
// REAL-TIME EVENT TYPES
// ============================================

export interface TaskEvent {
  type: 'TASK_CREATED' | 'TASK_UPDATED' | 'TASK_DELETED' | 'MESSAGE_ADDED' | 'STATUS_CHANGED' | 'ASSIGNEE_CHANGED';
  taskId: number;
  data: Task | TaskMessage | Partial<Task>;
  timestamp: string;
  userId: number;
}

// ============================================
// VALIDATION TYPES
// ============================================

export interface TaskValidationError {
  field: string;
  message: string;
}

export interface TaskValidationResult {
  isValid: boolean;
  errors: TaskValidationError[];
}

// ============================================
// PERMISSION TYPES
// ============================================

export interface TaskPermissions {
  canView: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canComment: boolean;
  canChangeStatus: boolean;
  canReassign: boolean;
  canApprove: boolean;
  canArchive: boolean;
}

// ============================================
// SPELL CHECK & FORMATTING TYPES
// ============================================

export interface SpellCheckResult {
  originalText: string;
  correctedText: string;
  suggestions: Array<{
    word: string;
    suggestions: string[];
    position: number;
  }>;
  hasErrors: boolean;
}

export interface FormattedTask {
  title: string;
  description: string;
  formattedDescription: string;
  spellCheckResults?: SpellCheckResult;
}

// ============================================
// CLARIFICATION TYPES
// ============================================

export enum ClarificationStatus {
  PENDING = 'pending',
  RESPONDED = 'responded',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
}

export enum ClarificationUrgency {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export interface ClarificationAttachment {
  id: string;
  name: string;
  url: string;
  type: string;
  size?: number;
}

export interface TaskClarification {
  id: string;
  taskId: number;
  tenantId?: string;
  
  // Requester info
  requesterId: number;
  requesterName?: string;
  requesterDepartment?: string;
  requesterUsername?: string;
  requesterEmail?: string;
  
  // Responder info
  responderId?: number;
  responderDepartmentId?: string;
  responderName?: string;
  responderType: 'user' | 'department';
  responderUsername?: string;
  responderEmail?: string;
  
  // Question
  question: string;
  attachments?: ClarificationAttachment[];
  
  // Response
  response?: string;
  responseAttachments?: ClarificationAttachment[];
  respondedById?: number;
  respondedByName?: string;
  respondedByUsername?: string;
  respondedAt?: string;
  
  // Status
  status: ClarificationStatus;
  urgency: ClarificationUrgency;
  
  // SLA tracking
  pauseSla: boolean;
  slaPausedAt?: string;
  slaResumedAt?: string;
  slaPausedHours?: number;
  
  // Expiry
  expiryHours: number;
  expiresAt?: string;
  
  // Previous task state
  previousTaskStatus?: string;
  
  // Timestamps
  createdAt: string;
  updatedAt?: string;
  
  // Task info (from joins)
  taskTitle?: string;
  taskDescription?: string;
  currentTaskStatus?: string;
  taskPriority?: string;
}

export interface ClarificationAuditEntry {
  id: number;
  clarificationId: string;
  taskId: number;
  actorId: number;
  actorName?: string;
  actorRole?: string;
  actorUsername?: string;
  actorEmail?: string;
  action: string;
  oldStatus?: string;
  newStatus?: string;
  comment?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface PendingClarificationsResponse {
  success: boolean;
  clarifications: TaskClarification[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface ClarificationStats {
  pendingCount: number;
  respondedCount: number;
  expiredCount: number;
  cancelledCount: number;
  avgPauseHours?: number;
  avgResponseHours?: number;
}

// ============================================
// POST-COMPLETION REVIEW TYPES
// ============================================

/**
 * Review purposes - why the task is being sent for review
 */
export enum ReviewPurpose {
  FYI = 'FYI',                     // For Information Only
  CONFIRMATION = 'CONFIRMATION',   // Request confirmation of understanding
  AUDIT = 'AUDIT',                 // For audit/compliance review
  KNOWLEDGE = 'KNOWLEDGE',         // Knowledge sharing/training
}

/**
 * Review status lifecycle
 */
export enum ReviewStatus {
  PENDING = 'PENDING',
  ACKNOWLEDGED = 'ACKNOWLEDGED',
  COMMENTED = 'COMMENTED',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
}

/**
 * Purpose option for UI selection
 */
export interface ReviewPurposeOption {
  value: ReviewPurpose;
  label: string;
  description: string;
}

/**
 * Review attachment
 */
export interface ReviewAttachment {
  id: string;
  name: string;
  url: string;
  type: string;
  size?: number;
}

/**
 * Review comment
 */
export interface ReviewComment {
  id: string;
  reviewId: string;
  authorId: number;
  authorName?: string;
  authorEmail?: string;
  content: string;
  attachments?: ReviewAttachment[];
  parentId?: string | null;
  createdAt: string;
  updatedAt?: string;
}

/**
 * Task review - main entity
 */
export interface TaskReview {
  id: string;
  taskId: number;
  tenantId?: string;
  
  // Sender info
  senderId: number;
  senderName?: string;
  senderEmail?: string;
  
  // Reviewer info (specific user)
  reviewerId?: number;
  reviewerName?: string;
  reviewerEmail?: string;
  
  // Reviewer department (alternative to specific user)
  reviewerDepartmentId?: string;
  
  // Review details
  purpose: ReviewPurpose;
  note?: string;
  attachments?: ReviewAttachment[];
  
  // Status
  status: ReviewStatus;
  
  // Acknowledgment
  acknowledgmentNote?: string;
  acknowledgedAt?: string;
  acknowledgedBy?: number;
  acknowledgedByName?: string;
  
  // Expiry
  expiryDays?: number;
  expiresAt?: string;
  
  // Priority
  priority: 'low' | 'normal' | 'high';
  
  // Timestamps
  createdAt: string;
  updatedAt?: string;
  
  // Task info (from joins)
  taskTitle?: string;
  taskDescription?: string;
  taskStatus?: string;
  taskPriority?: string;
  taskCompletedAt?: string;
  
  // Comment count
  commentCount?: number;
  
  // Comments (when expanded)
  comments?: ReviewComment[];
}

/**
 * Review audit entry
 */
export interface ReviewAuditEntry {
  id: number;
  reviewId: string;
  actorId: number;
  actorName?: string;
  actorEmail?: string;
  action: 'send' | 'view' | 'comment' | 'acknowledge' | 'cancel' | 'expire';
  oldStatus?: string;
  newStatus?: string;
  comment?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

/**
 * Review statistics for dashboard
 */
export interface ReviewStats {
  pendingToReview: number;
  pendingSent: number;
  totalAcknowledged: number;
  totalSent: number;
}

/**
 * API response types
 */
export interface PendingReviewsResponse {
  success: boolean;
  reviews: TaskReview[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface ReviewDetailsResponse {
  success: boolean;
  review: TaskReview & {
    comments: ReviewComment[];
  };
}

export interface ReviewAuditResponse {
  success: boolean;
  audit: ReviewAuditEntry[];
}
