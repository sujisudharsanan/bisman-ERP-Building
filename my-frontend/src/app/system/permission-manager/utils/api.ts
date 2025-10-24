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
    console.log('[PermissionManager] Fetching roles...');
    // Add cache-busting timestamp to ensure fresh data
    const timestamp = Date.now();
    const resp = await fetchJson<any>(`/api/privileges/roles?_t=${timestamp}`);
    console.log('[PermissionManager] Roles response:', resp);
    
    const rows = Array.isArray(resp?.data) ? resp.data : Array.isArray(resp) ? resp : [];
    console.log(`[PermissionManager] Found ${rows.length} roles in response`);
    
    const mapped: Role[] = rows.map((r: any) => ({
      id: String(r.id),
      name: r.name || String(r.id),
      userCount: typeof r.user_count !== 'undefined' ? Number(r.user_count) : (typeof r.userCount !== 'undefined' ? Number(r.userCount) : undefined)
    }));
    
    console.log('[PermissionManager] Mapped roles:', mapped.map(r => `${r.name} (ID: ${r.id}, ${r.userCount} users)`));
    
    if (!q) return mapped;
    const ql = q.toLowerCase();
    return mapped.filter(r => r.name.toLowerCase().includes(ql) || r.id.toLowerCase().includes(ql));
  },
  // Fetch users for a role from backend DB and locally filter by query
  searchUsersByRole: async (roleKey: string, q: string, roleName?: string): Promise<User[]> => {
    console.log(`[PermissionManager] Fetching users for role: ${roleKey} (${roleName || 'no name'})`);
    
    // Try with roleKey first; if empty, try roleName normalized
    const tryFetch = async (key: string) => {
      const url = `/api/privileges/users?role=${encodeURIComponent(key)}`;
      console.log(`[PermissionManager] Fetching: ${url}`);
      return fetchJson<any>(url);
    };
    
    let resp: any = null;
    try {
      resp = await tryFetch(roleKey);
      console.log(`[PermissionManager] Response:`, resp);
      
      // If we got an empty result and have a roleName, try alternative formats
      if (resp && Array.isArray(resp.data) && resp.data.length === 0 && roleName) {
        console.log(`[PermissionManager] Got 0 users with roleKey ${roleKey}, trying roleName variants...`);
        
        // Try exact role name first (e.g., "Hub Incharge")
        try {
          console.log(`[PermissionManager] Trying exact roleName: ${roleName}`);
          const resp2 = await tryFetch(roleName);
          if (resp2 && Array.isArray(resp2.data) && resp2.data.length > 0) {
            console.log(`[PermissionManager] Found users with exact roleName!`);
            resp = resp2;
          }
        } catch (e2) {
          // Continue to try other formats
        }
        
        // If still empty, try normalized format (e.g., "HUB_INCHARGE")
        if (resp.data.length === 0) {
          const norm = roleName.replace(/[\s-]+/g, '_').toUpperCase();
          console.log(`[PermissionManager] Trying normalized roleName: ${norm}`);
          try {
            const resp3 = await tryFetch(norm);
            if (resp3 && Array.isArray(resp3.data) && resp3.data.length > 0) {
              console.log(`[PermissionManager] Found users with normalized roleName!`);
              resp = resp3;
            }
          } catch (e3) {
            console.error(`[PermissionManager] All retry attempts failed`);
          }
        }
      }
    } catch (e1) {
      console.error(`[PermissionManager] Error with roleKey ${roleKey}:`, e1);
      if (roleName) {
        const norm = roleName.replace(/[\s-]+/g, '_').toUpperCase();
        console.log(`[PermissionManager] Retrying with normalized roleName: ${norm}`);
        resp = await tryFetch(norm);
        console.log(`[PermissionManager] Retry response:`, resp);
      } else {
        throw e1;
      }
    }
    
    const rows = Array.isArray(resp?.data) ? resp.data : Array.isArray(resp) ? resp : [];
    console.log(`[PermissionManager] Found ${rows.length} users in response`);
    
    const mapped: User[] = rows.map((u: any) => {
      const fullName = [u.first_name, u.last_name].filter(Boolean).join(' ').trim();
      const fromUsername = u?.username ? u.username.replace(/[._-]+/g, ' ').replace(/\s+/g, ' ').trim() : '';
      const fromEmail = u?.email ? String(u.email).split('@')[0].replace(/[._-]+/g, ' ').replace(/\s+/g, ' ').trim() : '';
      const titleCase = (s: string) => s ? s.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ') : '';
      const display = fullName || titleCase(fromUsername) || titleCase(fromEmail) || u.username || u.email || String(u.id);
      return { id: String(u.id), name: display, email: u.email, username: u.username };
    });
    
    console.log(`[PermissionManager] Mapped to ${mapped.length} User objects:`, mapped.map(u => u.name));
    
    if (!q) return mapped;
    const ql = q.toLowerCase();
    return mapped.filter(u => (u.name && u.name.toLowerCase().includes(ql)) || (u.email && u.email.toLowerCase().includes(ql)) || u.id.toLowerCase().includes(ql));
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
