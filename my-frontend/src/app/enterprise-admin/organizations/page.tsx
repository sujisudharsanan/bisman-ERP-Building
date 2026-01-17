'use client';

import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';

export default function EnterpriseOrganizationsPage() {
  return (
    <div className="container mx-auto p-6 space-y-6">
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
