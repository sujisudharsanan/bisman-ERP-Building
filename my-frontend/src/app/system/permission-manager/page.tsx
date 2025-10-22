'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import SuperAdminShell from '@/components/layouts/SuperAdminShell';
import RoleSearch from './components/RoleSearch';
import UserSearch from './components/UserSearch';
import PermissionTable from './components/PermissionTable';
import SaveButton from './components/SaveButton';
import UserAssignmentDialog from './components/UserAssignmentDialog';
import { usePermissions } from './hooks/usePermissions';
import { api } from './utils/api';


// Breadcrumb Navigation Component
function Breadcrumb({ items }: { items: Array<{ label: string; href?: string }> }) {
  return (
    <nav className="flex mb-4" aria-label="Breadcrumb">
      <ol className="inline-flex items-center space-x-1 md:space-x-3">
        <li className="inline-flex items-center">
          <Link
            href="/dashboard"
            className="inline-flex items-center text-sm font-medium text-gray-700 hover:text-blue-600 dark:text-gray-400 dark:hover:text-white"
          >
            <svg className="w-3 h-3 mr-2.5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
              <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"></path>
            </svg>
            Dashboard
          </Link>
        </li>
        {items.map((item, index) => (
          <li key={index}>
            <div className="flex items-center">
              <svg className="w-3 h-3 text-gray-400 mx-1" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd"></path>
              </svg>
              {item.href ? (
                <Link
                  href={item.href}
                  className="ml-1 text-sm font-medium text-gray-700 hover:text-blue-600 md:ml-2 dark:text-gray-400 dark:hover:text-white"
                >
                  {item.label}
                </Link>
              ) : (
                <span className="ml-1 text-sm font-medium text-gray-500 md:ml-2 dark:text-gray-400">
                  {item.label}
                </span>
              )}
            </div>
          </li>
        ))}
      </ol>
    </nav>
  );
}


// Quick Links Component
function QuickLinks({ links }: { links: Array<{ label: string; href: string; icon?: React.ReactNode }> }) {
  return (
    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
      <h3 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-3">Quick Links</h3>
      <div className="flex flex-wrap gap-2">
        {links.map((link, index) => (
          <Link
            key={index}
            href={link.href}
            className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-blue-700 bg-white dark:bg-blue-900 border border-blue-300 dark:border-blue-700 rounded-md hover:bg-blue-100 dark:hover:bg-blue-800 transition-colors"
          >
            {link.icon && <span className="mr-1.5">{link.icon}</span>}
            {link.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function PermissionManagerPage() {
  const perms = usePermissions();
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [unassigning, setUnassigning] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const handleUnassignUser = async (userId: string) => {
    if (!perms.role || !confirm('Remove this user from the role?')) return;
    
    try {
      setUnassigning(true);
      await api.unassignUserFromRole(parseInt(userId), parseInt(perms.role.id));
      // Refresh users list
      perms.refreshUsers();
      perms.setUser(null);
      setHasUnsavedChanges(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to remove user');
    } finally {
      setUnassigning(false);
    }
  };

  const handleAssignSuccess = () => {
    perms.refreshUsers();
  };

  const handlePermissionChange = () => {
    setHasUnsavedChanges(true);
  };

  const handleSave = async () => {
    await perms.save();
    setHasUnsavedChanges(false);
  };

  return (
    <SuperAdminShell title="Permission Manager">
      <div className="space-y-4">
        {/* Header Info */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-3">
          <h2 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-1">
            Role + User Hybrid Permission System
          </h2>
          <p className="text-xs text-blue-700 dark:text-blue-300">
            Permissions are primarily controlled by <strong>Role</strong>, with optional <strong>User-level overrides</strong>. 
            Final permissions = Role Permissions ∪ User Overrides.
          </p>
        </div>

        {/* Search Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">
              <span className="text-red-500">*</span> Select Role
            </label>
            <RoleSearch value={perms.role} onChange={(r) => { perms.setRole(r); perms.setUser(null); setHasUnsavedChanges(false); }} />
            {perms.role && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Selected: <strong>{perms.role.name}</strong>
                {perms.role.userCount !== undefined && ` (${perms.role.userCount} users)`}
              </p>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">
              <span className="text-red-500">*</span> Select User {perms.role ? `(from ${perms.role.name})` : ''}
            </label>
            <div className="flex gap-2">
              <div className="flex-1">
                <UserSearch 
                  roleId={perms.role?.id} 
                  roleName={perms.role?.name} 
                  value={perms.user} 
                  onChange={(u) => { perms.setUser(u); setHasUnsavedChanges(false); }} 
                  disabled={!perms.role}
                />
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
            {perms.user && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Selected: <strong>{perms.user.name}</strong>
                {perms.user.email && ` (${perms.user.email})`}
              </p>
            )}
          </div>
        </div>

        {/* Content Row: Users-in-role list + table */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Users in selected role */}
          <div className="lg:col-span-4">
            <div className="p-3 bg-white/50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-800 rounded-md h-full">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                  Users in {perms.role ? perms.role.name : 'selected role'}
                </h3>
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
                <div className="p-6 text-center text-sm text-gray-600 dark:text-gray-300 bg-white/50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-800 rounded-md">
                  <div className="mb-2 text-lg">🔐</div>
                  <div className="font-medium mb-1">Select Role and User to Manage Permissions</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Choose a role from the dropdown, then select a user to view and modify their page access permissions.
                  </div>
                </div>
              ) : (
                <>
                  {/* Permission Stats */}
                  <div className="mb-3 p-3 bg-gray-50 dark:bg-slate-900/50 border border-gray-200 dark:border-slate-700 rounded-md">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">Role Default Pages</div>
                          <div className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                            {perms.roleDefaultCount} pages
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">User Overrides</div>
                          <div className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                            {perms.userOverrideCount} custom
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">Total Permissions</div>
                          <div className="text-sm font-semibold text-green-600 dark:text-green-400">
                            {perms.allowed.length} / {perms.allPages.length}
                          </div>
                        </div>
                      </div>
                      {hasUnsavedChanges && (
                        <div className="flex items-center gap-2 text-xs text-yellow-600 dark:text-yellow-400">
                          <span className="animate-pulse">●</span>
                          <span>Unsaved changes</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <PermissionTable
                    pages={perms.allPages}
                    allowed={perms.allowed}
                    roleDefaults={perms.roleDefaults}
                    showOverridePages={perms.showOverridePages}
                    onToggle={(key) => { perms.toggle(key); handlePermissionChange(); }}
                    onSelectDefault={() => { perms.selectDefault(); handlePermissionChange(); }}
                    onDeselectAll={() => { perms.deselectAll(); handlePermissionChange(); }}
                    onToggleOverrideView={perms.toggleOverrideView}
                  />
                </>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-between items-center">
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {perms.canSelect && (
              <>
                {hasUnsavedChanges ? (
                  <span className="text-yellow-600 dark:text-yellow-400 font-medium">
                    ⚠️ You have unsaved changes
                  </span>
                ) : (
                  <span className="text-green-600 dark:text-green-400">
                    ✓ All changes saved
                  </span>
                )}
              </>
            )}
          </div>
          <SaveButton 
            onClick={handleSave} 
            disabled={!perms.canSelect || !hasUnsavedChanges} 
          />
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
