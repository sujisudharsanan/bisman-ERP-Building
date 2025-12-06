export type Role = { id: string; name: string; userCount?: number };
export type User = { id: string; name: string; email?: string; username?: string };
export type PageItem = { key: string; name: string; module?: string };

const fetchJson = async <T>(url: string): Promise<T> => {
  console.log('[API] Fetching:', url);
  const res = await fetch(url, { credentials: 'include' });
  console.log('[API] Response status:', res.status, res.statusText);
  if (!res.ok) {
    const errorText = await res.text().catch(() => res.statusText);
    console.error('[API] Error response:', errorText);
    throw new Error(`${res.status} ${res.statusText}: ${errorText}`);
  }
  const data = await res.json();
  console.log('[API] Response data:', data);
  return data;
};

export const api = {
  // Fetch roles from backend DB and locally filter by query
  searchRoles: async (q: string): Promise<Role[]> => {
    console.log('[PermissionManager] Fetching roles from roles-users report (properly filtered)...');
    try {
      // Use the roles-users report endpoint which has proper SUPER_ADMIN filtering
      const resp = await fetchJson<any>(`/api/reports/roles-users`);
      console.log('[PermissionManager] Roles-users report response:', resp);
      
      // The response has { success: true, data: [...], summary: {...} }
      const rolesData = Array.isArray(resp?.data) ? resp.data : [];
      console.log(`[PermissionManager] Found ${rolesData.length} roles from report`);
      
      // Map to our Role format
      const mapped: Role[] = rolesData.map((r: any) => ({
        id: r.roleName || r.roleId,
        name: r.roleDisplayName || r.roleName,
        userCount: r.userCount || 0
      }));
      
      console.log('[PermissionManager] Extracted roles:', mapped.map(r => `${r.name} (${r.userCount} users)`));
      
      if (!q) return mapped;
      const ql = q.toLowerCase();
      return mapped.filter(r => r.name.toLowerCase().includes(ql) || r.id.toLowerCase().includes(ql));
    } catch (error) {
      console.error('[PermissionManager] Error fetching from roles-users report:', error);
      // SECURITY: Don't fallback to unfiltered endpoints - return empty instead
      // This ensures SUPER_ADMIN only sees their assigned roles
      console.warn('[PermissionManager] No fallback - returning empty to maintain security');
      return [];
    }
  },
  // Fetch users for a role from the roles-users report (properly filtered for SUPER_ADMIN)
  searchUsersByRole: async (roleKey: string, q: string, roleName?: string): Promise<User[]> => {
    console.log(`[PermissionManager] Fetching users for role: ${roleKey} (${roleName || 'no name'})`);
    
    try {
      // Use the roles-users report endpoint which already has users embedded and is properly filtered
      const resp = await fetchJson<any>(`/api/reports/roles-users`);
      console.log('[PermissionManager] Roles-users report response for users:', resp);
      
      // Find the role in the report data
      const rolesData = Array.isArray(resp?.data) ? resp.data : [];
      const targetRole = rolesData.find((r: any) => {
        const rName = (r.roleName || '').toLowerCase();
        const rDisplay = (r.roleDisplayName || '').toLowerCase();
        const searchKey = roleKey.toLowerCase();
        const searchName = (roleName || '').toLowerCase();
        return rName === searchKey || rDisplay === searchKey || rName === searchName || rDisplay === searchName;
      });
      
      if (!targetRole) {
        console.warn(`[PermissionManager] Role not found in report: ${roleKey}`);
        return [];
      }
      
      // Extract users from the role
      const roleUsers = Array.isArray(targetRole.users) ? targetRole.users : [];
      console.log(`[PermissionManager] Found ${roleUsers.length} users for role ${roleKey}`);
      
      // Map to User format
      const mapped: User[] = roleUsers.map((u: any) => {
        const fullName = [u.first_name, u.last_name].filter(Boolean).join(' ').trim();
        const fromUsername = u?.username ? u.username.replace(/[._-]+/g, ' ').replace(/\s+/g, ' ').trim() : '';
        const fromEmail = u?.email ? String(u.email).split('@')[0].replace(/[._-]+/g, ' ').replace(/\s+/g, ' ').trim() : '';
        const titleCase = (s: string) => s ? s.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ') : '';
        const display = fullName || titleCase(fromUsername) || titleCase(fromEmail) || u.username || u.email || String(u.userId || u.id);
        return { 
          id: String(u.userId || u.id), 
          name: display, 
          email: u.email, 
          username: u.username 
        };
      });
      
      console.log(`[PermissionManager] Mapped to ${mapped.length} User objects:`, mapped.map(u => u.name));
      
      if (!q) return mapped;
      const ql = q.toLowerCase();
      return mapped.filter(u => (u.name && u.name.toLowerCase().includes(ql)) || (u.email && u.email.toLowerCase().includes(ql)) || u.id.toLowerCase().includes(ql));
    } catch (error) {
      console.error('[PermissionManager] Error fetching users from roles-users report:', error);
      // SECURITY: Don't fallback to unfiltered endpoints - return empty instead
      return [];
    }
  },
  // Fetch all users from backend DB (no role filter) and locally filter by query
  searchAllUsers: async (q: string): Promise<User[]> => {
    const resp = await fetchJson<any>(`/api/users`);
    const rows = Array.isArray(resp?.data) ? resp.data : Array.isArray(resp) ? resp : [];
    const mapped: User[] = rows.map((u: any) => {
      const fullName = [u.first_name, u.last_name].filter(Boolean).join(' ').trim();
      const fromUsername = u?.username ? u.username.replace(/[._-]+/g, ' ').replace(/\s+/g, ' ').trim() : '';
      const fromEmail = u?.email ? String(u.email).split('@')[0].replace(/[._-]+/g, ' ').replace(/\s+/g, ' ').trim() : '';
      const titleCase = (s: string) => s ? s.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ') : '';
      const display = fullName || titleCase(fromUsername) || titleCase(fromEmail) || u.username || u.email || String(u.id);
      return { id: String(u.id), name: display, email: u.email, username: u.username };
    });
    if (!q) return mapped;
    const ql = q.toLowerCase();
    return mapped.filter(u => (u.name && u.name.toLowerCase().includes(ql)) || (u.email && u.email.toLowerCase().includes(ql)) || u.id.toLowerCase().includes(ql));
  },
  getPages: async (): Promise<PageItem[]> => {
    console.log('[API] Fetching pages from /api/pages');
    try {
      const data = await fetchJson<any>(`/api/pages`);
      console.log('[API] Pages response:', data);
      const rows = Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []);
      console.log('[API] Extracted', rows.length, 'pages');
      return rows.map((p: any) => ({ key: String(p.key || p.id || p.path || p.name).toLowerCase(), name: p.name || p.label || p.path || 'Page', module: p.module || p.category || undefined }));
    } catch (error) {
      console.error('[API] Error fetching pages:', error);
      throw error;
    }
  },
  getUserPermissions: async (userId: string): Promise<string[]> => {
    console.log('[API] Fetching permissions for user:', userId);
    try {
      const data = await fetchJson<any>(`/api/permissions?userId=${encodeURIComponent(userId)}`);
      console.log('[API] Permissions response:', data);
      const arr = data?.data?.allowedPages || data?.allowedPages || [];
      console.log('[API] User has', arr.length, 'permissions');
      return Array.isArray(arr) ? arr.map((x: any) => String(x)) : [];
    } catch (error) {
      console.error('[API] Error fetching permissions:', error);
      throw error;
    }
  },
  savePermissions: async (payload: { roleId: string; userId: string; allowedPages: string[] }) => {
    const res = await fetch(`/api/permissions/update`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  // Get all available users for assignment
  getAvailableUsers: async (): Promise<User[]> => {
    const resp = await fetchJson<any>(`/api/privileges/available-users`);
    const rows = Array.isArray(resp?.users) ? resp.users : [];
    return rows.map((u: any) => ({
      id: String(u.id),
      name: u.username || u.email || String(u.id),
      email: u.email,
      username: u.username
    }));
  },
  // Assign a user to a role
  assignUserToRole: async (userId: number, roleId: number) => {
    const res = await fetch(`/api/privileges/assign-user`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, roleId }),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error?.error?.message || 'Failed to assign user');
    }
    return res.json();
  },
  // Remove a user from a role
  unassignUserFromRole: async (userId: number, roleId: number) => {
    const res = await fetch(`/api/privileges/unassign-user?userId=${userId}&roleId=${roleId}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error?.error?.message || 'Failed to remove user');
    }
    return res.json();
  },
};
