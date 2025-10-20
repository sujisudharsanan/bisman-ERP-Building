'use client';

import React from 'react';
import SuperAdminLayout from '@/common/layouts/superadmin-layout';
import { useAuth } from '@/common/hooks/useAuth';
import AboutMePage from '@/common/components/AboutMePage';

/**
 * Finance Module - About Me Page
 * Accessible to CFO, Finance Controller, Treasury, Accounts roles
 */
export default function FinanceAboutMe() {
  const { hasAccess, user } = useAuth();

  // Check if user has finance access
  const hasFinanceAccess =
    hasAccess('executive-dashboard') ||
    hasAccess('general-ledger') ||
    hasAccess('financial-statements');

  if (!hasFinanceAccess) {
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

  // Custom employees for finance team
  const financeTeam = [
    {
      id: 1,
      name: user?.name || user?.username || 'Finance User',
      role: user?.roleName || 'Finance Team Member',
      photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&h=200&q=80',
      about: `Experienced ${user?.roleName || 'finance professional'} at BISMAN ERP. Specialized in financial management, accounting, and strategic planning.`,
      details: [
        { label: 'Employee ID', value: user?.id?.toString() || 'N/A' },
        { label: 'Designation', value: user?.roleName || 'Finance Team' },
        { label: 'Department', value: 'Finance & Accounts' },
        { label: 'Official Email', value: user?.email || 'N/A' },
        { label: 'Username', value: user?.username || 'N/A' },
      ],
      education: {
        title: 'Education & Certifications',
        items: [
          'Chartered Accountant (CA) / MBA Finance',
          'CPA / ACCA Certification',
          'Advanced Financial Management Training',
        ],
      },
      awards: {
        title: 'Achievements and Awards',
        items: [
          'Excellence in Financial Reporting - 2023',
          'Best Finance Team Member Award',
          'Contribution to Process Improvement',
        ],
      },
      experience: {
        title: 'Experience History',
        items: [
          `<strong>${user?.roleName || 'Finance Role'}</strong> - BISMAN ERP: Managing financial operations with focus on accuracy and compliance.`,
          '<strong>Financial Analyst</strong> - Previous Company: Conducted financial analysis and reporting.',
        ],
      },
    },
  ];

  return (
    <SuperAdminLayout
      title="About Me"
      description="View and manage your finance profile"
    >
      <AboutMePage customEmployees={financeTeam} showTeamSidebar={false} />
    </SuperAdminLayout>
  );
}
