'use client';

import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';

export default function AdminModulesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Modules"
        description="Manage system modules and features"
      />

      <Card>
        <CardHeader>
          <CardTitle>Available Modules</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Module configuration will be displayed here.</p>
        </CardContent>
      </Card>
    </div>
  );
}
