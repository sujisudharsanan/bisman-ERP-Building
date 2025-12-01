'use client';

import SuperAdminLayout from '@/common/layouts/superadmin-layout';
import UserCreationPage from '@/modules/system/pages/user-creation';

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
