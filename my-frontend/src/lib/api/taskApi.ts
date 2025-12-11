/**
 * Task API Client
 * Type-safe API client for task management v2
 */

// ============================================
// TYPES
// ============================================

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  position: number;
  
  // Relations
  creator_id: number;
  assigned_to?: number;
  approver_id?: number;
  parent_id?: string;
  tenant_id?: string;
  
  // Metadata
  tags?: string[];
  metadata?: Record<string, any>;
  due_date?: string;
  
  // Denormalized counts
  message_count: number;
  attachment_count: number;
  
  // Timestamps
  created_at: string;
  updated_at: string;
  confirmed_at?: string;
  completed_at?: string;
  
  // Relations (populated)
  creator?: User;
  assignee?: User;
  approver?: User;
  messages?: TaskMessage[];
  attachments?: TaskAttachment[];
  
  // UI helpers
  statusInfo?: TaskStatusInfo;
}

export type TaskStatus = 
  | 'ASSIGNED' 
  | 'IN_PROGRESS' 
  | 'NEED_ATTENTION' 
  | 'DONE'
  | 'CANCELLED';

export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface TaskStatusInfo {
  isCreator: boolean;
  isAssignee: boolean;
  canComplete: boolean;
  canCancel: boolean;
}

export interface User {
  id: number;
  username: string;
  email?: string;
  avatar_url?: string;
}

export interface TaskMessage {
  id: string;
  task_id: string;
  sender_id: number;
  content: string;
  message_type: 'user' | 'system' | 'ai';
  created_at: string;
  updated_at: string;
  sender?: User;
}

export interface TaskAttachment {
  id: string;
  task_id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  file_url: string;
  uploaded_by: number;
  created_at: string;
  uploader?: User;
}

export interface KanbanData {
  ASSIGNED: Task[];
  IN_PROGRESS: Task[];
  NEED_ATTENTION: Task[];
  DONE: Task[];
}

// ============================================
// REQUEST TYPES
// ============================================

export interface ListTasksParams {
  status?: TaskStatus;
  priority?: TaskPriority;
  assignedTo?: number;
  creatorId?: number;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: 'created_at' | 'updated_at' | 'due_date' | 'priority' | 'position';
  sortOrder?: 'asc' | 'desc';
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  priority?: TaskPriority;
  assigned_to?: number;
  approver_id?: number;
  due_date?: string;
  tags?: string[];
  metadata?: Record<string, any>;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  priority?: TaskPriority;
  assigned_to?: number;
  approver_id?: number;
  due_date?: string;
  tags?: string[];
  metadata?: Record<string, any>;
}

export interface UpdateStatusInput {
  status: TaskStatus;
  comment?: string;
}

export interface UpdatePositionInput {
  status: TaskStatus;
  position: number;
}

export interface CreateMessageInput {
  content: string;
  message_type?: 'user' | 'system' | 'ai';
}

// ============================================
// RESPONSE TYPES
// ============================================

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ============================================
// API CLIENT
// ============================================

const API_BASE = '/api/v2/tasks';

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'An error occurred' }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }
  
  const data = await response.json();
  return data.data || data;
}

export const taskApi = {
  /**
   * List tasks with filters
   */
  async list(params?: ListTasksParams): Promise<Task[]> {
    const searchParams = new URLSearchParams();
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.set(key, String(value));
        }
      });
    }
    
    const url = `${API_BASE}${searchParams.toString() ? `?${searchParams}` : ''}`;
    const response = await fetch(url, { credentials: 'include' });
    return handleResponse<Task[]>(response);
  },
  
  /**
   * Get Kanban board data
   */
  async getKanban(): Promise<KanbanData> {
    const response = await fetch(`${API_BASE}/kanban`, { credentials: 'include' });
    return handleResponse<KanbanData>(response);
  },
  
  /**
   * Get single task by ID
   */
  async getById(id: string): Promise<Task> {
    const response = await fetch(`${API_BASE}/${id}`, { credentials: 'include' });
    return handleResponse<Task>(response);
  },
  
  /**
   * Create new task
   */
  async create(input: CreateTaskInput): Promise<Task> {
    const response = await fetch(API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(input)
    });
    return handleResponse<Task>(response);
  },
  
  /**
   * Update task
   */
  async update(id: string, input: UpdateTaskInput): Promise<Task> {
    const response = await fetch(`${API_BASE}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(input)
    });
    return handleResponse<Task>(response);
  },
  
  /**
   * Update task status
   */
  async updateStatus(id: string, input: UpdateStatusInput): Promise<Task> {
    const response = await fetch(`${API_BASE}/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(input)
    });
    return handleResponse<Task>(response);
  },
  
  /**
   * Update task position (drag-and-drop)
   */
  async updatePosition(id: string, input: UpdatePositionInput): Promise<Task> {
    const response = await fetch(`${API_BASE}/${id}/position`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(input)
    });
    return handleResponse<Task>(response);
  },
  
  /**
   * Delete (archive) task
   */
  async delete(id: string): Promise<void> {
    const response = await fetch(`${API_BASE}/${id}`, {
      method: 'DELETE',
      credentials: 'include'
    });
    await handleResponse<void>(response);
  },
  
  /**
   * Get task messages
   */
  async getMessages(taskId: string, page = 1, limit = 50): Promise<TaskMessage[]> {
    const response = await fetch(
      `${API_BASE}/${taskId}/messages?page=${page}&limit=${limit}`,
      { credentials: 'include' }
    );
    return handleResponse<TaskMessage[]>(response);
  },
  
  /**
   * Create task message
   */
  async createMessage(taskId: string, input: CreateMessageInput): Promise<TaskMessage> {
    const response = await fetch(`${API_BASE}/${taskId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(input)
    });
    return handleResponse<TaskMessage>(response);
  },
  
  /**
   * Get task attachments
   */
  async getAttachments(taskId: string): Promise<TaskAttachment[]> {
    const response = await fetch(`${API_BASE}/${taskId}/attachments`, {
      credentials: 'include'
    });
    return handleResponse<TaskAttachment[]>(response);
  },
  
  /**
   * Upload attachment
   */
  async uploadAttachment(taskId: string, file: File): Promise<TaskAttachment> {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await fetch(`${API_BASE}/${taskId}/attachments`, {
      method: 'POST',
      credentials: 'include',
      body: formData
    });
    return handleResponse<TaskAttachment>(response);
  }
};

export default taskApi;
