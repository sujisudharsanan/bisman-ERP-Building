// Support Ticket Types

export interface Ticket {
  id: string;
  ticket_number: string;
  title: string;
  description: string;
  category: TicketCategory;
  module: string;
  priority: TicketPriority;
  status: TicketStatus;
  created_at: string;
  updated_at: string;
  user_id: string;
  user_name?: string;
  assigned_to?: string;
  assigned_to_name?: string;
  system_info?: SystemInfo;
  attachments?: AttachmentFile[];
  comments?: Comment[];
  activity_log?: ActivityLog[];
}

export type TicketCategory =
  | 'login_access'
  | 'data_mismatch'
  | 'payment_billing'
  | 'approvals_workflow'
  | 'mattermost_chatbot'
  | 'calendar_scheduling'
  | 'erp_performance'
  | 'request_feature'
  | 'others';

export type TicketPriority = 'low' | 'medium' | 'high' | 'critical';

export type TicketStatus =
  | 'open'
  | 'in_progress'
  | 'waiting_user'
  | 'resolved'
  | 'closed';

export interface SystemInfo {
  browser: string;
  device: string;
  erp_version: string;
  os: string;
  user_id?: string;
  hub_id?: string;
  timestamp?: string;
  screen_resolution?: string;
  user_agent?: string;
}

export interface AttachmentFile {
  id: string;
  file_name: string;
  file_url: string;
  file_size: number;
  file_type?: string;
  uploaded_at: string;
  uploaded_by?: string;
}

export interface Comment {
  id: string;
  ticket_id: string;
  user_id: string;
  user_name: string;
  user_role: string;
  message: string;
  is_internal?: boolean; // Internal notes not visible to ticket creator
  created_at: string;
  updated_at?: string;
  attachments?: AttachmentFile[];
}

export interface ActivityLog {
  id: string;
  ticket_id: string;
  action: string;
  details: string;
  created_at: string;
  user_id: string;
  user_name: string;
}

// Form Types
export interface CreateTicketForm {
  category: TicketCategory;
  module: string;
  title: string;
  description: string;
  priority: TicketPriority;
  attachments?: File[];
}

export interface TicketFilter {
  search?: string;
  status?: TicketStatus | 'all';
  priority?: TicketPriority | 'all';
  module?: string | 'all';
  category?: TicketCategory | 'all';
  date_from?: string;
  date_to?: string;
}

// API Response Types
export interface TicketsResponse {
  tickets: Ticket[];
  total: number;
  page: number;
  pageSize: number;
}

export interface TicketDetailResponse {
  ticket: Ticket;
}

export interface CreateTicketResponse {
  ticket: Ticket;
  message: string;
}

export interface CommentResponse {
  comment: Comment;
  message: string;
}

// Statistics
export interface TicketStats {
  total: number;
  open: number;
  in_progress: number;
  waiting_response: number;
  resolved: number;
  closed: number;
  avg_response_time?: number; // in hours
  avg_resolution_time?: number; // in hours
}
