'use client';

import PagesRolesReportContent from '@/components/reports/PagesRolesReportContent';

export default function SuperAdminPagesRolesReportPage() {
  // Super Admin only sees assigned pages (showAllPagesDefault=false)
  return <PagesRolesReportContent showAllPagesDefault={false} />;
}
