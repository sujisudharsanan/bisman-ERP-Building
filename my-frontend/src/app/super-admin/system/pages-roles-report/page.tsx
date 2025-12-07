'use client';

import PagesRolesReportPage from '@/app/system/pages-roles-report/page';

export default function SuperAdminPagesRolesReportPage() {
  // Super Admin only sees assigned pages (showAllPagesDefault=false)
  return <PagesRolesReportPage showAllPagesDefault={false} />;
}
