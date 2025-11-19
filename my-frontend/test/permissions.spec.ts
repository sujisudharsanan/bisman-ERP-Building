import { describe, it, expect } from 'vitest';
import { can, PERMISSIONS, SessionUser } from '@/lib/permissions';

const superUser: SessionUser = { id: '1', email: 'a', roles: ['SUPER_ADMIN'] } as any;
const orgAdmin: SessionUser = { id: '2', email: 'b', roles: ['ORG_ADMIN'], memberships: [{ organizationId: 'org1', role: 'ORG_ADMIN' as any }] };

describe('permissions', () => {
  it('SUPER_ADMIN bypasses', () => {
    expect(can(superUser, PERMISSIONS.APIKEY_MANAGE)).toBe(true);
  });
  it('ORG_ADMIN needs membership for org-scoped', () => {
    expect(can(orgAdmin, PERMISSIONS.ORGANIZATION_READ, 'org1')).toBe(true);
    expect(can(orgAdmin, PERMISSIONS.ORGANIZATION_READ, 'orgX')).toBe(false);
  });
});
