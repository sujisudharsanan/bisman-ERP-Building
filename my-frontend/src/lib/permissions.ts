export const PERMISSIONS = {
  ORGANIZATION_READ: 'organization.read',
  ORGANIZATION_WRITE: 'organization.write',
  USER_MANAGE: 'user.manage',
  MODULE_TOGGLE: 'module.toggle',
  BILLING_VIEW: 'billing.view',
  AUDIT_VIEW: 'audit.view',
  SETTINGS_MANAGE: 'settings.manage',
  APIKEY_MANAGE: 'apikey.manage',
  // Enterprise-wide permissions (visible only to SUPER/ENTERPRISE admins)
  ENTERPRISE_DASHBOARD_VIEW: 'enterprise.dashboard.view',
  ENTERPRISE_SUPERADMINS_MANAGE: 'enterprise.superadmins.manage',
  ENTERPRISE_ORGANIZATIONS_READ: 'enterprise.organizations.read',
  ENTERPRISE_MODULES_MANAGE: 'enterprise.modules.manage',
  ENTERPRISE_BILLING_VIEW: 'enterprise.billing.view',
  ENTERPRISE_AUDIT_VIEW: 'enterprise.audit.view',
  ENTERPRISE_INTEGRATIONS_MANAGE: 'enterprise.integrations.manage',
  ENTERPRISE_SUPPORT_VIEW: 'enterprise.support.view',
  ENTERPRISE_AI_MANAGE: 'enterprise.ai.manage',
  ENTERPRISE_REPORTS_VIEW: 'enterprise.reports.view',
  ENTERPRISE_SETTINGS_MANAGE: 'enterprise.settings.manage',
  ENTERPRISE_NOTIFICATIONS_MANAGE: 'enterprise.notifications.manage',
} as const;

export type RoleKey = 'SUPER_ADMIN' | 'ENTERPRISE_ADMIN' | 'ORG_ADMIN' | 'ORG_USER';

const ROLE_PERMISSIONS: Record<RoleKey, string[]> = {
  SUPER_ADMIN: Object.values(PERMISSIONS),
  ENTERPRISE_ADMIN: [
    PERMISSIONS.ORGANIZATION_READ,
    PERMISSIONS.ORGANIZATION_WRITE,
    PERMISSIONS.USER_MANAGE,
    PERMISSIONS.MODULE_TOGGLE,
    PERMISSIONS.BILLING_VIEW,
    PERMISSIONS.AUDIT_VIEW,
    PERMISSIONS.SETTINGS_MANAGE,
    PERMISSIONS.APIKEY_MANAGE,
    // Enterprise
    PERMISSIONS.ENTERPRISE_DASHBOARD_VIEW,
    PERMISSIONS.ENTERPRISE_SUPERADMINS_MANAGE,
    PERMISSIONS.ENTERPRISE_ORGANIZATIONS_READ,
    PERMISSIONS.ENTERPRISE_MODULES_MANAGE,
    PERMISSIONS.ENTERPRISE_BILLING_VIEW,
    PERMISSIONS.ENTERPRISE_AUDIT_VIEW,
    PERMISSIONS.ENTERPRISE_INTEGRATIONS_MANAGE,
    PERMISSIONS.ENTERPRISE_SUPPORT_VIEW,
    PERMISSIONS.ENTERPRISE_AI_MANAGE,
    PERMISSIONS.ENTERPRISE_REPORTS_VIEW,
    PERMISSIONS.ENTERPRISE_SETTINGS_MANAGE,
    PERMISSIONS.ENTERPRISE_NOTIFICATIONS_MANAGE,
  ],
  ORG_ADMIN: [
    PERMISSIONS.ORGANIZATION_READ,
    PERMISSIONS.USER_MANAGE,
    PERMISSIONS.MODULE_TOGGLE,
    PERMISSIONS.BILLING_VIEW,
    PERMISSIONS.AUDIT_VIEW,
  ],
  ORG_USER: [PERMISSIONS.ORGANIZATION_READ],
};

export interface SessionUser {
  id: string;
  email: string;
  roles: RoleKey[];
  memberships?: Array<{ organizationId: string; role: RoleKey }>;
}

export function hasPermission(user: SessionUser | null | undefined, permission: string, orgId?: string) {
  if (!user) return false;
  if (user.roles?.includes('SUPER_ADMIN')) return true;
  const granted = new Set<string>();
  (user.roles || []).forEach((r) => ROLE_PERMISSIONS[r].forEach((p) => granted.add(p)));
  if (!granted.has(permission)) return false;
  // If org-scoped, require membership
  if (orgId) {
    return !!user.memberships?.some((m) => m.organizationId === orgId);
  }
  return true;
}

export function can(user: SessionUser | null | undefined, permission: string, orgId?: string) {
  return hasPermission(user, permission, orgId);
}
