'use client';

import React, { useState } from 'react';
import SuperAdminShell from '@/components/layouts/SuperAdminShell';
import RoleSearch from './components/RoleSearch';
import UserSearch from './components/UserSearch';
import PermissionTable from './components/PermissionTable';
import SaveButton from './components/SaveButton';
import UserAssignmentDialog from './components/UserAssignmentDialog';
import { usePermissions } from './hooks/usePermissions';
import { api } from './utils/api';

export default function PermissionManagerPage() {
  const perms = usePermissions();
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [unassigning, setUnassigning] = useState(false);

  const handleUnassignUser = async (userId: string) => {
    if (!perms.role || !confirm('Remove this user from the role?')) return;
    
    try {
      setUnassigning(true);
      await api.unassignUserFromRole(parseInt(userId), parseInt(perms.role.id));
      // Refresh users list
      perms.refreshUsers();
      perms.setUser(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to remove user');
    } finally {
      setUnassigning(false);
    }
  };

  const handleAssignSuccess = () => {
    perms.refreshUsers();
  };

  return (
    <SuperAdminShell title="Permission Manager">
      <div className="space-y-4">
        {/* Search Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Role</label>
            <RoleSearch value={perms.role} onChange={(r) => { perms.setRole(r); perms.setUser(null); }} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">User</label>
            <div className="flex gap-2">
              <div className="flex-1">
                <UserSearch roleId={perms.role?.id} roleName={perms.role?.name} value={perms.user} onChange={perms.setUser} />
              </div>
              <a
                href="/api/users/report"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-sm border border-blue-700 whitespace-nowrap h-[38px]"
                title="Download Users CSV"
              >
                Download CSV
              </a>
            </div>
          </div>
        </div>

        {/* Content Row: Users-in-role list + table */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Users in selected role */}
          <div className="lg:col-span-4">
            <div className="p-3 bg-white/50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-800 rounded-md h-full">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Users in role</h3>
                <div className="flex items-center gap-2">
                  {perms.role && (
                    <button
                      onClick={() => setShowAssignDialog(true)}
                      className="text-xs px-2 py-1 rounded bg-green-600 hover:bg-green-700 text-white"
                      title="Assign user to this role"
                    >
                      + Assign
                    </button>
                  )}
                  {perms.usersLoading && <span className="text-xs text-gray-500 dark:text-gray-400">Loading…</span>}
                </div>
              </div>
              {/* Error display */}
              {perms.usersError && (
                <div className="text-xs text-red-400 mb-2">{perms.usersError}</div>
              )}
              {/* Diagnostics when no users found */}
              {perms.role && perms.usersForRole.length === 0 && !perms.showingAllUsers && (
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                  No users found for this role.
                  {typeof perms.allUsersCount === 'number' && (
                    <>
                      {' '}DB has {perms.allUsersCount} total user{perms.allUsersCount === 1 ? '' : 's'}.
                    </>
                  )}
                </div>
              )}
              {/* Show all users button */}
              {perms.role && perms.usersForRole.length === 0 && (
                <div className="mb-2">
                  {!perms.showingAllUsers ? (
                    <button onClick={perms.showAllUsers} className="text-xs px-2 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white">Show all users</button>
                  ) : (
                    <button onClick={perms.backToRoleUsers} className="text-xs px-2 py-1 rounded bg-gray-700 hover:bg-gray-600 text-white">Back to role users</button>
                  )}
                </div>
              )}
              <div className="max-h-72 overflow-auto divide-y divide-gray-100 dark:divide-slate-800">
                {perms.usersForRole.length === 0 ? (
                  <div className="text-sm text-gray-600 dark:text-gray-300 py-3">
                    {perms.role ? 'No users found for this role.' : 'Select a role to see users.'}
                  </div>
                ) : (
                  perms.usersForRole.map(u => (
                    <div key={u.id} className="flex items-center group">
                      <button
                        onClick={() => perms.setUser(u)}
                        className={`flex-1 text-left px-2 py-2 text-sm rounded hover:bg-gray-100 dark:hover:bg-slate-800 ${perms.user?.id === u.id ? 'bg-gray-100 dark:bg-slate-800' : ''}`}
                      >
                        <div className="font-medium text-gray-800 dark:text-gray-100">{u.name}</div>
                        {u.email && <div className="text-xs text-gray-500 dark:text-gray-400">{u.email}</div>}
                      </button>
                      <button
                        onClick={() => handleUnassignUser(u.id)}
                        disabled={unassigning}
                        className="opacity-0 group-hover:opacity-100 px-2 py-1 text-xs text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-opacity"
                        title="Remove from role"
                      >
                        ✕
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Permissions table */}
          <div className="lg:col-span-8">
            <div className="mt-2 lg:mt-0">
              {!perms.canSelect ? (
                <div className="p-4 text-sm text-gray-600 dark:text-gray-300 bg-white/50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-800 rounded-md">
                  Select a role and user to view and edit page access.
                </div>
              ) : (
                <PermissionTable
                  pages={perms.allPages}
                  allowed={perms.allowed}
                  onToggle={perms.toggle}
                  onSelectAll={perms.selectAll}
                  onSelectDefault={perms.selectDefault}
                  onDeselectAll={perms.deselectAll}
                />
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end">
          <SaveButton onClick={perms.save} disabled={!perms.canSelect} />
        </div>
      </div>

      {/* Assignment Dialog */}
      {showAssignDialog && perms.role && (
        <UserAssignmentDialog
          roleId={perms.role.id}
          roleName={perms.role.name}
          onClose={() => setShowAssignDialog(false)}
          onSuccess={handleAssignSuccess}
        />
      )}
    </SuperAdminShell>
  );
}
