import { describe, it, expect } from 'vitest';
import { PERMISSIONS, can, type SessionUser } from './permissions';

describe('permissions helper', () => {
  const base: SessionUser = { id: 'u1', email: 'x@y.z', roles: [], memberships: [] };

  it('SUPER_ADMIN bypasses permission checks', () => {
    const user: SessionUser = { ...base, roles: ['SUPER_ADMIN'] };
    expect(can(user, PERMISSIONS.AUDIT_VIEW)).toBe(true);
  });

  it('SYSTEM_ADMIN bypasses permission checks', () => {
    const user: SessionUser = { ...base, roles: ['SYSTEM_ADMIN'] };
    expect(can(user, PERMISSIONS.APIKEY_MANAGE)).toBe(true);
  });

  it('ADMIN bypasses permission checks', () => {
    const user: SessionUser = { ...base, roles: ['ADMIN'] };
    expect(can(user, PERMISSIONS.SETTINGS_MANAGE)).toBe(true);
  });

  it('ORG_USER lacks manage permissions', () => {
    const user: SessionUser = { ...base, roles: ['ORG_USER'] };
    expect(can(user, PERMISSIONS.USER_MANAGE)).toBe(false);
    expect(can(user, PERMISSIONS.ORGANIZATION_READ)).toBe(true);
  });

  it('org-scoped requires membership when orgId provided', () => {
    const user: SessionUser = { ...base, roles: ['ORG_ADMIN'], memberships: [{ organizationId: 'o1', role: 'ORG_ADMIN' }] };
    expect(can(user, PERMISSIONS.MODULE_TOGGLE, 'o1')).toBe(true);
    expect(can(user, PERMISSIONS.MODULE_TOGGLE, 'o2')).toBe(false);
  });
});
