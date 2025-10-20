'use client';

import React from 'react';
import SuperAdminLayout from '@/common/layouts/superadmin-layout';
import { useAuth } from '@/common/hooks/useAuth';
import AboutMePage from '@/common/components/AboutMePage';

/**
 * Procurement Module - About Me Page
 * Accessible to Procurement Officer and related roles
 */
export default function ProcurementAboutMe() {
  const { hasAccess, user } = useAuth();

  // Check if user has procurement access
  if (!hasAccess('purchase-order') && !hasAccess('purchase-request')) {
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

  const procurementTeam = [
    {
      id: 1,
      name: user?.name || user?.username || 'Procurement User',
      role: user?.roleName || 'Procurement Officer',
      photo: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=200&h=200&q=80',
      about: `Experienced ${user?.roleName || 'procurement professional'} at BISMAN ERP. Expert in supplier management, purchase order processing, and vendor relations.`,
      details: [
        { label: 'Employee ID', value: user?.id?.toString() || 'N/A' },
        { label: 'Designation', value: user?.roleName || 'Procurement Team' },
        { label: 'Department', value: 'Procurement & Supply Chain' },
        { label: 'Official Email', value: user?.email || 'N/A' },
        { label: 'Username', value: user?.username || 'N/A' },
      ],
      education: {
        title: 'Education & Certifications',
        items: [
          'MBA in Supply Chain Management',
          'Certified Professional in Supply Management (CPSM)',
          'Procurement Excellence Certification',
        ],
      },
      awards: {
        title: 'Achievements and Awards',
        items: [
          'Best Supplier Relations Manager - 2023',
          'Cost Savings Initiative Award',
          'Excellence in Procurement Process',
        ],
      },
      experience: {
        title: 'Experience History',
        items: [
          `<strong>${user?.roleName || 'Procurement Role'}</strong> - BISMAN ERP: Managing procurement operations with focus on cost optimization and quality.`,
          '<strong>Purchase Executive</strong> - Previous Company: Handled vendor relationships and purchase orders.',
        ],
      },
    },
  ];

  return (
    <SuperAdminLayout
      title="About Me"
      description="View and manage your procurement profile"
    >
      <AboutMePage customEmployees={procurementTeam} showTeamSidebar={false} />
    </SuperAdminLayout>
  );
}
