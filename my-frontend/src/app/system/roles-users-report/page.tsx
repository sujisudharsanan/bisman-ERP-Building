'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import SuperAdminShell from '@/components/layouts/SuperAdminShell';

interface User {
  userId: number;
  username: string;
  email: string;
  createdAt: string;
}

interface RoleData {
  roleId: number;
  roleName: string;
  roleDisplayName: string;
  roleDescription: string | null;
  roleLevel: number | null;
  roleStatus: string;
  userCount: number;
  users: User[];
}

interface ReportSummary {
  totalRoles: number;
  totalUsers: number;
  rolesWithUsers: number;
  rolesWithoutUsers: number;
  generatedAt: string;
}


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

export default function RolesUsersReportPage() {
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<RoleData[]>([]);
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedRoles, setExpandedRoles] = useState<Set<number>>(new Set());

  const loadReport = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/reports/roles-users', {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`Failed to load report: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        setReportData(data.data);
        setSummary(data.summary);
      } else {
        throw new Error(data.error || 'Failed to load report');
      }
    } catch (err: any) {
      setError(err.message);
      console.error('[RolesUsersReport] Error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, []);

  const downloadCSV = () => {
    window.open('/api/reports/roles-users/csv', '_blank');
  };

  const toggleRole = (roleId: number) => {
    setExpandedRoles(prev => {
      const newSet = new Set(prev);
      if (newSet.has(roleId)) {
        newSet.delete(roleId);
      } else {
        newSet.add(roleId);
      }
      return newSet;
    });
  };

  const expandAll = () => {
    setExpandedRoles(new Set(reportData.map(r => r.roleId)));
  };

  const collapseAll = () => {
    setExpandedRoles(new Set());
  };

  return (
    <SuperAdminShell title="Roles & Users Report">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
              System Roles and Users Report
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Complete list of all roles with assigned users and their email addresses
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadReport}
              disabled={loading}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-md transition-colors disabled:opacity-50"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {loading ? 'Loading...' : 'Refresh'}
            </button>
            <button
              onClick={downloadCSV}
              disabled={loading || !summary}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm text-white bg-green-600 hover:bg-green-700 border border-green-700 rounded-md transition-colors disabled:opacity-50"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Download CSV
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
              <div className="text-sm text-blue-600 dark:text-blue-400">Total Roles</div>
              <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">{summary.totalRoles}</div>
            </div>
            <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
              <div className="text-sm text-green-600 dark:text-green-400">Total Users</div>
              <div className="text-2xl font-bold text-green-900 dark:text-green-100">{summary.totalUsers}</div>
            </div>
            <div className="p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-md">
              <div className="text-sm text-purple-600 dark:text-purple-400">Roles with Users</div>
              <div className="text-2xl font-bold text-purple-900 dark:text-purple-100">{summary.rolesWithUsers}</div>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-md">
              <div className="text-sm text-gray-600 dark:text-gray-400">Empty Roles</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{summary.rolesWithoutUsers}</div>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm text-red-800 dark:text-red-200">{error}</span>
            </div>
          </div>
        )}

        {/* Expand/Collapse Controls */}
        {reportData.length > 0 && (
          <div className="flex items-center gap-2">
            <button
              onClick={expandAll}
              className="text-xs px-2 py-1 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded border border-blue-300 dark:border-blue-700"
            >
              Expand All
            </button>
            <button
              onClick={collapseAll}
              className="text-xs px-2 py-1 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 rounded border border-gray-300 dark:border-gray-700"
            >
              Collapse All
            </button>
          </div>
        )}

        {/* Report Table */}
        <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Loading report...</p>
            </div>
          ) : reportData.length === 0 ? (
            <div className="p-8 text-center text-gray-600 dark:text-gray-400">
              No roles found in the system
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
                <thead className="bg-gray-50 dark:bg-slate-900">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Users
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
                  {reportData.map((role) => (
                    <React.Fragment key={role.roleId}>
                      <tr className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                        <td className="px-4 py-3">
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                              <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                {role.roleDisplayName}
                              </div>
                              <span className="text-xs px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded font-mono">
                                ID: {role.roleId}
                              </span>
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                              DB Role: {role.roleName}
                            </div>
                            {role.roleDescription && (
                              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                {role.roleDescription}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            role.roleStatus === 'active' 
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                          }`}>
                            {role.roleStatus}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold ${
                            role.userCount > 0
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                              : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                          }`}>
                            {role.userCount}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {role.userCount > 0 && (
                            <button
                              onClick={() => toggleRole(role.roleId)}
                              className="text-xs px-2 py-1 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                            >
                              {expandedRoles.has(role.roleId) ? 'Hide Users' : 'Show Users'}
                            </button>
                          )}
                        </td>
                      </tr>
                      {expandedRoles.has(role.roleId) && role.users.length > 0 && (
                        <tr>
                          <td colSpan={4} className="px-4 py-2 bg-gray-50 dark:bg-slate-900/50">
                            <div className="ml-8">
                              <table className="min-w-full">
                                <thead>
                                  <tr className="border-b border-gray-200 dark:border-slate-700">
                                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-600 dark:text-gray-400">User ID</th>
                                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-600 dark:text-gray-400">Username</th>
                                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-600 dark:text-gray-400">Email</th>
                                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-600 dark:text-gray-400">Created</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                                  {role.users.map((user) => (
                                    <tr key={user.userId} className="hover:bg-gray-100 dark:hover:bg-slate-800">
                                      <td className="px-2 py-2 text-xs text-gray-600 dark:text-gray-400">{user.userId}</td>
                                      <td className="px-2 py-2 text-xs font-medium text-gray-900 dark:text-gray-100">{user.username}</td>
                                      <td className="px-2 py-2 text-xs text-blue-600 dark:text-blue-400">{user.email}</td>
                                      <td className="px-2 py-2 text-xs text-gray-500 dark:text-gray-400">
                                        {new Date(user.createdAt).toLocaleDateString()}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer Info */}
        {summary && (
          <div className="text-xs text-gray-500 dark:text-gray-400 text-right">
            Generated at: {new Date(summary.generatedAt).toLocaleString()}
          </div>
        )}
      </div>
    </SuperAdminShell>
  );
}
