'use client';

import PagesRolesReportPage from '@/app/system/pages-roles-report/page';

export default function EnterpriseAdminPagesRolesReportPage() {
  // Enterprise Admin sees ALL pages (showAllPagesDefault=true)
  return <PagesRolesReportPage showAllPagesDefault={true} />;
}
