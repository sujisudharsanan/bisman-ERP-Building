'use client';

import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';

export default function EnterpriseOrganizationsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Organizations"
        description="Manage all organizations in the enterprise"
      />

      <Card>
        <CardHeader>
          <CardTitle>Organization List</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Enterprise organizations will be displayed here.</p>
        </CardContent>
      </Card>
    </div>
  );
}
