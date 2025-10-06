// Role & User Privilege Management Types
// Production-ready interfaces following international standards

export interface Role {
  id: string;
  name: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  user_count?: number;
}

export interface User {
  id: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role_id: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  role?: Role;
}

export interface Feature {
  id: string;
  name: string;
  module: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Privilege {
  id: string;
  feature_id: string;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
  can_hide: boolean;
  created_at: string;
  updated_at: string;
  feature?: Feature;
}

export interface RolePrivilege extends Privilege {
  role_id: string;
  role?: Role;
}

export interface UserPrivilege extends Privilege {
  user_id: string;
  role_id: string; // For audit trail
  overrides_role: boolean; // If this overrides the role default
  user?: User;
  role?: Role;
}

export interface PrivilegeMatrix {
  feature_id: string;
  feature_name: string;
  module: string;
  role_privileges: Record<string, Privilege>; // role_id -> privilege
  user_overrides: Record<string, UserPrivilege>; // user_id -> privilege override
}

export interface AuditLog {
  id: string;
  user_id: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'VIEW';
  entity_type: 'ROLE_PRIVILEGE' | 'USER_PRIVILEGE' | 'ROLE' | 'USER' | 'FEATURE';
  entity_id: string;
  old_values?: Record<string, any>;
  new_values?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
  user?: User;
}

// API Response Types
export interface RolesResponse {
  success: boolean;
  data: Role[];
  total: number;
}

export interface UsersResponse {
  success: boolean;
  data: User[];
  total: number;
}

export interface PrivilegesResponse {
  success: boolean;
  data: {
    features: Feature[];
    role_privileges: RolePrivilege[];
    user_privileges: UserPrivilege[];
  };
}

export interface UpdatePrivilegeRequest {
  type: 'ROLE' | 'USER';
  target_id: string; // role_id or user_id
  privileges: {
    feature_id: string;
    can_view: boolean;
    can_create: boolean;
    can_edit: boolean;
    can_delete: boolean;
    can_hide: boolean;
  }[];
}

export interface SyncSchemaResponse {
  success: boolean;
  data: {
    new_features: Feature[];
    updated_features: Feature[];
    removed_features: string[];
  };
  message: string;
}

// Form and UI State Types
export interface PrivilegeTableRow extends Feature {
  role_privilege?: Privilege;
  user_privilege?: UserPrivilege;
  has_user_override: boolean;
}

export interface PrivilegeFormData {
  [feature_id: string]: {
    can_view: boolean;
    can_create: boolean;
    can_edit: boolean;
    can_delete: boolean;
    can_hide: boolean;
  };
}

export interface ExportOptions {
  format: 'CSV' | 'PDF';
  include_user_overrides: boolean;
  include_inactive_features: boolean;
  selected_roles?: string[];
  selected_users?: string[];
}

// Database Connection Health
export interface DatabaseHealth {
  connected: boolean;
  response_time: number;
  active_connections: number;
  last_checked: string;
  version?: string;
  issues?: string[];
}

// Filter and Search Options
export interface PrivilegeFilters {
  role_ids?: string[];
  user_ids?: string[];
  modules?: string[];
  has_overrides?: boolean;
  search_term?: string;
}

// Validation and Error Types
export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ApiError {
  success: false;
  error: {
    message: string;
    code: string;
    details?: ValidationError[];
  };
  timestamp: string;
}

// Success Response Type
export interface ApiSuccess<T = any> {
  success: true;
  data: T;
  message?: string;
  timestamp: string;
}

export type ApiResponse<T = any> = ApiSuccess<T> | ApiError;

// Component Props Types
export interface RoleSelectorProps {
  roles: Role[];
  selectedRole: string | null;
  onRoleChange: (roleId: string | null) => void;
  loading?: boolean;
  error?: string | null;
}

export interface UserSelectorProps {
  users: User[];
  selectedUser: string | null;
  onUserChange: (userId: string | null) => void;
  loading?: boolean;
  error?: string | null;
  disabled?: boolean;
}

export interface PrivilegeTableProps {
  privileges: PrivilegeTableRow[];
  selectedRole: string | null;
  selectedUser: string | null;
  onPrivilegeChange: (featureId: string, privilege: Partial<Privilege>) => void;
  loading?: boolean;
  error?: string | null;
  readOnly?: boolean;
}
