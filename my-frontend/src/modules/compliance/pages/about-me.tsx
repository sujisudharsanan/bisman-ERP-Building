'use client';

import React from 'react';
import SuperAdminLayout from '@/common/layouts/superadmin-layout';
import { useAuth } from '@/common/hooks/useAuth';
import AboutMePage from '@/common/components/AboutMePage';

/**
 * Compliance Module - About Me Page
 * Accessible to Compliance and Legal roles
 */
export default function ComplianceAboutMe() {
  const { hasAccess, user } = useAuth();

  // Check if user has compliance access
  if (!hasAccess('compliance-dashboard') && !hasAccess('audit-trail')) {
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

  const complianceTeam = [
    {
      id: 1,
      name: user?.name || user?.username || 'Compliance User',
      role: user?.roleName || 'Compliance Officer',
      photo: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=200&h=200&q=80',
      about: `Experienced ${user?.roleName || 'compliance professional'} at BISMAN ERP. Expert in regulatory compliance, policy management, and audit coordination.`,
      details: [
        { label: 'Employee ID', value: user?.id?.toString() || 'N/A' },
        { label: 'Designation', value: user?.roleName || 'Compliance Team' },
        { label: 'Department', value: 'Compliance & Legal' },
        { label: 'Official Email', value: user?.email || 'N/A' },
        { label: 'Username', value: user?.username || 'N/A' },
      ],
      education: {
        title: 'Education & Certifications',
        items: [
          'LLB / MBA with specialization in Compliance',
          'Certified Compliance Professional (CCP)',
          'ISO 9001 Internal Auditor Certification',
        ],
      },
      awards: {
        title: 'Achievements and Awards',
        items: [
          'Excellence in Compliance Management - 2023',
          'Zero Non-Compliance Achievement',
          'Best Audit Coordination Award',
        ],
      },
      experience: {
        title: 'Experience History',
        items: [
          `<strong>${user?.roleName || 'Compliance Role'}</strong> - BISMAN ERP: Ensuring regulatory compliance and policy adherence across organization.`,
          '<strong>Compliance Analyst</strong> - Previous Company: Monitored compliance requirements and conducted audits.',
        ],
      },
    },
  ];

  return (
    <SuperAdminLayout
      title="About Me"
      description="View and manage your compliance profile"
    >
      <AboutMePage customEmployees={complianceTeam} showTeamSidebar={false} />
    </SuperAdminLayout>
  );
}
