import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'BISMAN ERP - Enterprise Admin Dashboard',
  description: 'Enterprise Admin Control Panel - Manage Super Admins and Module Assignments',
};

export default function EnterpriseAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
