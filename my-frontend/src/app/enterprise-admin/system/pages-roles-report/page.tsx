'use client';

import PagesRolesReportContent from '@/components/reports/PagesRolesReportContent';

export default function EnterpriseAdminPagesRolesReportPage() {
  // Enterprise Admin sees ALL pages (showAllPagesDefault=true)
  return <PagesRolesReportContent showAllPagesDefault={true} />;
}
