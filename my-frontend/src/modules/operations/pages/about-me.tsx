'use client';

import React from 'react';
import SuperAdminLayout from '@/common/layouts/superadmin-layout';
import { useAuth } from '@/common/hooks/useAuth';
import AboutMePage from '@/common/components/AboutMePage';

/**
 * Operations Module - About Me Page
 * Accessible to Operations Manager, Store Incharge, Hub Incharge roles
 */
export default function OperationsAboutMe() {
  const { hasAccess, user } = useAuth();

  // Check if user has operations access
  if (!hasAccess('kpi-dashboard') && !hasAccess('sales-order') && !hasAccess('stock-entry')) {
    return (
      <SuperAdminLayout title="Access Denied">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="text-6xl mb-4">🔒</div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              Access Denied
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              You don't have permission to view this page.
            </p>
          </div>
        </div>
      </SuperAdminLayout>
    );
  }

  const operationsTeam = [
    {
      id: 1,
      name: user?.name || user?.username || 'Operations User',
      role: user?.roleName || 'Operations Manager',
      photo: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=200&h=200&q=80',
      about: `Experienced ${user?.roleName || 'operations professional'} at BISMAN ERP. Specialized in operational excellence, inventory management, and logistics coordination.`,
      details: [
        { label: 'Employee ID', value: user?.id?.toString() || 'N/A' },
        { label: 'Designation', value: user?.roleName || 'Operations Team' },
        { label: 'Department', value: 'Operations & Logistics' },
        { label: 'Official Email', value: user?.email || 'N/A' },
        { label: 'Username', value: user?.username || 'N/A' },
      ],
      education: {
        title: 'Education & Certifications',
        items: [
          'B.Tech / MBA in Operations Management',
          'Six Sigma Green Belt Certification',
          'Warehouse Management Systems Training',
        ],
      },
      awards: {
        title: 'Achievements and Awards',
        items: [
          'Excellence in Operations Management - 2023',
          'Process Improvement Champion Award',
          'Best Team Performance Award',
        ],
      },
      experience: {
        title: 'Experience History',
        items: [
          `<strong>${user?.roleName || 'Operations Role'}</strong> - BISMAN ERP: Managing daily operations with focus on efficiency and quality.`,
          '<strong>Operations Supervisor</strong> - Previous Company: Supervised warehouse and logistics operations.',
        ],
      },
    },
  ];

  return (
    <SuperAdminLayout
      title="About Me"
      description="View and manage your operations profile"
    >
      <AboutMePage customEmployees={operationsTeam} showTeamSidebar={false} />
    </SuperAdminLayout>
  );
}
