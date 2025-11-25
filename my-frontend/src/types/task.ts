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
}

// ============================================
// TASK TYPES
// ============================================

export interface Task {
  id: number;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  
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
// FORM & INPUT TYPES
// ============================================

export interface CreateTaskInput {
  title: string;
  description?: string;
  assigneeId: number;
  approverId?: number;
  priority?: TaskPriority;
  dueDate?: string;
  estimatedHours?: number;
  requiresApproval?: boolean;
  attachments?: File[];
  organizationId?: number;
  departmentId?: number;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assigneeId?: number;
  approverId?: number;
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
  assigneeId?: number;
  creatorId?: number;
  approverId?: number;
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
