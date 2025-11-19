// Centralized role definitions after SUPER_ADMIN refactor
export const ROLE_PLATFORM_ADMIN = 'SYSTEM_ADMIN'; // Highest platform level
export const ROLE_TENANT_ADMIN = 'ADMIN'; // Former SUPER_ADMIN users downgraded here

export const CORE_ROLES = [ROLE_PLATFORM_ADMIN, ROLE_TENANT_ADMIN];
export const EXTENDED_ROLES = [ROLE_PLATFORM_ADMIN, ROLE_TENANT_ADMIN, 'MANAGER', 'STAFF', 'CFO', 'FINANCE_CONTROLLER', 'HUB_INCHARGE'];

// Helper guards
export function isPlatformAdmin(role?: string) {
  return role === ROLE_PLATFORM_ADMIN;
}
export function isTenantAdmin(role?: string) {
  return role === ROLE_TENANT_ADMIN || role === ROLE_PLATFORM_ADMIN; // platform inherits tenant admin abilities
}