'use client';

import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';

export default function AdminIntegrationsPage() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader
        title="Integrations"
        description="Manage third-party integrations and connections"
      />

      <Card>
        <CardHeader>
          <CardTitle>Available Integrations</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Integration settings and connections will be displayed here.</p>
        </CardContent>
      </Card>
    </div>
  );
}
