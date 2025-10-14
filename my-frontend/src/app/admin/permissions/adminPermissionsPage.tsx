'use client';
import React from 'react';
import AdminDashboard from '../../../components/admin/AdminDashboard';
import { RequirePermission } from '../../../contexts/PermissionContext';
import DashboardLayout from '@/components/layout/DashboardLayout';

export default function AdminPermissionsPage() {
  return (
    <RequirePermission action="admin.permissions.view" route="/admin/permissions">
      <DashboardLayout role="ADMIN">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-6">
          <div className="mb-6 border-b border-gray-200 pb-4">
            <h1 className="text-3xl font-bold leading-tight text-gray-900">Permission Management</h1>
            <p className="mt-2 text-sm text-gray-600">
              Manage roles, users, routes, and permissions for your ERP system
            </p>
          </div>
          <AdminDashboard user={{}} />
        </div>
      </DashboardLayout>
    </RequirePermission>
  );
}
