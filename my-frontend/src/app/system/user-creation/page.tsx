import SuperAdminLayout from '@/common/layouts/superadmin-layout';
import UserCreationPage from '@/modules/system/pages/user-creation';

export const metadata = {
  title: 'Create User | BISMAN ERP',
  description: 'Create and register new users in the system',
};

export default function UserCreationRoute() {
  return (
    <SuperAdminLayout
      title="Create User"
      description="Register a new user with complete profile and access settings"
    >
      <UserCreationPage />
    </SuperAdminLayout>
  );
}
