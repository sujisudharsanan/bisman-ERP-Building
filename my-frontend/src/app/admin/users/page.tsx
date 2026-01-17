'use client';

import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';

export default function AdminUsersPage() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader
        title="Users Management"
        description="Manage users and their permissions"
      />

      <Card>
        <CardHeader>
          <CardTitle>User List</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">User management will be displayed here.</p>
        </CardContent>
      </Card>
    </div>
  );
}
