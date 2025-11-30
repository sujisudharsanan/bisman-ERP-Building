export const ROLE_PLATFORM_ADMIN = 'SYSTEM_ADMIN';
export const ROLE_TENANT_ADMIN = 'ADMIN';
export const LEGACY_SUPER_ADMIN = 'SUPER_ADMIN';
export const ROLE_ENTERPRISE_ADMIN = 'ENTERPRISE_ADMIN';

export function isPlatformAdmin(role?: string) {
  return role === ROLE_PLATFORM_ADMIN;
}
export function isEnterpriseAdmin(role?: string) {
  return role === ROLE_ENTERPRISE_ADMIN;
}
export function isTenantAdmin(role?: string) {
  return role === ROLE_TENANT_ADMIN || role === ROLE_PLATFORM_ADMIN;
}
export function isLegacySuper(role?: string) {
  return role === LEGACY_SUPER_ADMIN;
}
export function hasFullAdmin(role?: string) {
  // Enterprise Admin is the top-most role - has access to everything
  return isPlatformAdmin(role) || isEnterpriseAdmin(role) || isTenantAdmin(role) || isLegacySuper(role);
}