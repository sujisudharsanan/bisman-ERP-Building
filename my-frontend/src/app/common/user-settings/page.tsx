import SuperAdminLayout from '@/common/layouts/superadmin-layout';
import UserSettingsPage from '@/modules/common/pages/user-settings';

export const metadata = {
  title: 'User Settings | BISMAN ERP',
  description: 'Manage your profile, preferences, and account settings',
};

export default function UserSettingsRoute() {
  return (
    <SuperAdminLayout
      title="User Settings"
      description="Manage your profile and preferences"
    >
      <UserSettingsPage />
    </SuperAdminLayout>
  );
}
