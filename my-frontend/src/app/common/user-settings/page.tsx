import SuperAdminLayout from '@/common/layouts/superadmin-layout';
import UserSettingsPage from '@/modules/common/pages/user-settings';

export const metadata = {
  title: 'User Management | BISMAN ERP',
  description: 'Manage users and monitor subscription usage',
};

export default function UserSettingsRoute() {
  return (
    <SuperAdminLayout
      title="User Management"
      description="Manage users and subscription"
    >
      <UserSettingsPage />
    </SuperAdminLayout>
  );
}
