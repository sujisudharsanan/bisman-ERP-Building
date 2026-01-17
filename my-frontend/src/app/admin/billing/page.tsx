'use client';

import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';

export default function AdminBillingPage() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader
        title="Billing Management"
        description="Manage billing and payment settings"
      />

      <Card>
        <CardHeader>
          <CardTitle>Billing Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Billing information and settings will be displayed here.</p>
        </CardContent>
      </Card>
    </div>
  );
}
