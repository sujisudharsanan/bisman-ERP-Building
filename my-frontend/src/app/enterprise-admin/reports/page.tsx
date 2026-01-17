'use client';

import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';

export default function EnterpriseReportsPage() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader
        title="Enterprise Reports"
        description="View and generate enterprise-wide reports"
      />

      <Card>
        <CardHeader>
          <CardTitle>Available Reports</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Enterprise reports will be displayed here.</p>
        </CardContent>
      </Card>
    </div>
  );
}
