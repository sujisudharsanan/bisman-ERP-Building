// Privilege Management Components Export
// Production-ready role & user privilege management system

export { PrivilegeManagement } from './PrivilegeManagement';
export { RoleSelector } from './RoleSelector';
export { UserSelector } from './UserSelector';  
export { PrivilegeTable } from './PrivilegeTable';
export { default as PermissionTreePicker, generatePermissionId, parsePermissionId } from './PermissionTreePicker';
export type { Module, Page, Action, PermissionTreePickerProps } from './PermissionTreePicker';

// Re-export types for convenience
export type {
  Role,
  User,
  Feature,
  Privilege,
  RolePrivilege,
  UserPrivilege,
  PrivilegeMatrix,
  AuditLog,
  RolesResponse,
  UsersResponse,
  PrivilegesResponse,
  UpdatePrivilegeRequest,
  SyncSchemaResponse,
  PrivilegeTableRow,
  PrivilegeFormData,
  ExportOptions,
  DatabaseHealth,
  PrivilegeFilters,
  ValidationError,
  ApiError,
  ApiSuccess,
  ApiResponse,
  RoleSelectorProps,
  UserSelectorProps,
  PrivilegeTableProps
} from '@/types/privilege-management';
