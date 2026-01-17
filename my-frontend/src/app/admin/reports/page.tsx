'use client';

import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';

export default function AdminReportsPage() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader
        title="Reports"
        description="View and generate system reports"
      />

      <Card>
        <CardHeader>
          <CardTitle>Available Reports</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Report options will be displayed here.</p>
        </CardContent>
      </Card>
    </div>
  );
}
