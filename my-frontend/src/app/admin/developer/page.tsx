'use client';

import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';

export default function AdminDeveloperPage() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader
        title="Developer Tools"
        description="API documentation and developer resources"
      />

      <Card>
        <CardHeader>
          <CardTitle>Developer Resources</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">API documentation and developer tools will be displayed here.</p>
        </CardContent>
      </Card>
    </div>
  );
}
