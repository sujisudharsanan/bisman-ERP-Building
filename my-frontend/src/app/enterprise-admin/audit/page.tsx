'use client';

import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';

export default function EnterpriseAuditPage() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader
        title="Enterprise Audit"
        description="View enterprise-wide audit logs and activities"
      />

      <Card>
        <CardHeader>
          <CardTitle>Audit Logs</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Enterprise audit logs will be displayed here.</p>
        </CardContent>
      </Card>
    </div>
  );
}
