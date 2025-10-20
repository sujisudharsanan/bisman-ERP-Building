'use client';

import { useEffect, useMemo, useState } from 'react';
import { api, PageItem, Role, User } from '../utils/api';
import { getDefaultPagesForRole } from '@/common/config/role-default-pages';

export function usePermissions() {
  const [role, setRole] = useState<Role | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [usersForRole, setUsersForRole] = useState<User[]>([]);
  const [allPages, setAllPages] = useState<PageItem[]>([]);
  const [allowed, setAllowed] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [allUsersCount, setAllUsersCount] = useState<number | null>(null);
  const [showingAllUsers, setShowingAllUsers] = useState(false);

  // Load users: only for selected role
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setUsersLoading(true);
      try {
        setUsersError(null);
        setShowingAllUsers(false);
        // Show users for selected role only
        const list = role ? await api.searchUsersByRole(role.id, '', role.name) : [];
        if (!cancelled) {
          setUsersForRole(list);
          // If role selected but empty result, probe total DB users to aid diagnosis
          if (role && list.length === 0) {
            try {
              const all = await api.searchAllUsers('');
              if (!cancelled) setAllUsersCount(all.length);
            } catch {
              if (!cancelled) setAllUsersCount(null);
            }
          } else {
            setAllUsersCount(null);
          }
        }
      } catch (e: any) {
        if (!cancelled) {
          setUsersError(e?.message || 'Failed to load users');
          setUsersForRole([]);
          setAllUsersCount(null);
        }
      } finally {
        if (!cancelled) setUsersLoading(false);
      }
    })();
    return () => { cancelled = true };
  }, [role]);

  const showAllUsers = async () => {
    setUsersLoading(true);
    setUsersError(null);
    try {
      const all = await api.searchAllUsers('');
      setUsersForRole(all);
      setAllUsersCount(all.length);
      setShowingAllUsers(true);
    } catch (e: any) {
      setUsersError(e?.message || 'Failed to load users');
    } finally {
      setUsersLoading(false);
    }
  };

  const backToRoleUsers = async () => {
    if (!role) return;
    setUsersLoading(true);
    setUsersError(null);
    try {
      const list = await api.searchUsersByRole(role.id, '', role.name);
      setUsersForRole(list);
      setShowingAllUsers(false);
    } catch (e: any) {
      setUsersError(e?.message || 'Failed to load role users');
    } finally {
      setUsersLoading(false);
    }
  };

  const refreshUsers = async () => {
    if (!role) return;
    setUsersLoading(true);
    setUsersError(null);
    try {
      const list = await api.searchUsersByRole(role.id, '', role.name);
      setUsersForRole(list);
    } catch (e: any) {
      setUsersError(e?.message || 'Failed to refresh users');
    } finally {
      setUsersLoading(false);
    }
  };

  // Load pages when needed
  useEffect(() => {
    if (role && user) {
      console.log('[usePermissions] Loading pages for role:', role.name, 'user:', user.name);
      setLoading(true);
      Promise.all([api.getPages(), api.getUserPermissions(user.id)])
        .then(([pages, current]) => {
          console.log('[usePermissions] Pages loaded:', pages.length, 'Current permissions:', current.length);
          setAllPages(pages);
          
          // If user has no permissions yet, select role-based default pages
          if (current.length === 0 && role) {
            const roleDefaults = getDefaultPagesForRole(role.name);
            console.log('[usePermissions] No permissions found, selecting role-based defaults:', roleDefaults);
            
            // If role has wildcard (*), select all pages
            if (roleDefaults.includes('*')) {
              setAllowed(pages.map(p => p.key));
            } else {
              // Filter pages that exist in the registry
              const validDefaults = roleDefaults.filter(key => 
                pages.some(p => p.key === key)
              );
              setAllowed(validDefaults);
            }
          } else {
            setAllowed(current);
          }
        })
        .catch((error) => {
          console.error('[usePermissions] Error loading pages:', error);
          setAllPages([]);
          setAllowed([]);
        })
        .finally(() => setLoading(false));
    } else {
      console.log('[usePermissions] Not loading pages - role:', role?.name, 'user:', user?.name);
    }
  }, [role, user]);

  const toggle = (key: string) => {
    setAllowed(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  };
  const selectAll = (checked: boolean) => {
    setAllowed(checked ? allPages.map(p => p.key) : []);
  };
  const deselectAll = () => {
    setAllowed([]);
  };
  const selectDefault = () => {
    if (!role) return;
    
    const roleDefaults = getDefaultPagesForRole(role.name);
    console.log('[usePermissions] Selecting defaults for role:', role.name, roleDefaults);
    
    // If role has wildcard (*), select all pages
    if (roleDefaults.includes('*')) {
      setAllowed(allPages.map(p => p.key));
    } else {
      // Filter pages that exist in the registry
      const validDefaults = roleDefaults.filter(key => 
        allPages.some(p => p.key === key)
      );
      setAllowed(validDefaults);
    }
  };

  const canSelect = useMemo(() => Boolean(role && user), [role, user]);

  const save = async () => {
    if (!role || !user) return;
    await api.savePermissions({ roleId: role.id, userId: user.id, allowedPages: allowed });
  };

  return { role, setRole, user, setUser, usersForRole, usersLoading, usersError, allUsersCount, showingAllUsers, showAllUsers, backToRoleUsers, refreshUsers, allPages, allowed, toggle, selectAll, deselectAll, selectDefault, canSelect, loading, save } as const;
}
