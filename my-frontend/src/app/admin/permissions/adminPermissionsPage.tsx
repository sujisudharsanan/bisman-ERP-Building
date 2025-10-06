'use client';
import React from 'react';
import AdminDashboard from '../../../components/admin/AdminDashboard';
import { RequirePermission } from '../../../contexts/PermissionContext';

export default function AdminPermissionsPage() {
  return (
    <RequirePermission
      action="admin.permissions.view"
      route="/admin/permissions"
    >
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          {/* Page Header */}
          <div className="px-4 py-6 sm:px-0">
            <div className="border-b border-gray-200 pb-4">
              <h1 className="text-3xl font-bold leading-tight text-gray-900">
                Permission Management
              </h1>
              <p className="mt-2 text-sm text-gray-600">
                Manage roles, users, routes, and permissions for your ERP system
              </p>
            </div>
          </div>

          {/* Main Content */}
          <div className="px-4 sm:px-0">
            <AdminDashboard user={{}} />
          </div>
        </div>
      </div>
    </RequirePermission>
  );
}
