'use client';

import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';

export default function AdminOrganizationsPage() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader
        title="Organizations"
        description="Manage organizations and their settings"
      />

      <Card>
        <CardHeader>
          <CardTitle>Organization List</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Organizations will be displayed here.</p>
        </CardContent>
      </Card>
    </div>
  );
}
