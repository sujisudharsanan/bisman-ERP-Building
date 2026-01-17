'use client';

import React from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';

export default function EnterpriseAdminUsersPage() {
  return (
    <div className="container mx-auto p-6">
      <PageHeader
        title="Users Management"
        description="Manage enterprise users across organizations"
      />
      <Card>
        <CardHeader>
          <CardTitle>Enterprise Users</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500 dark:text-gray-400">
            User management features coming soon.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
