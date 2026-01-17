'use client';

import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';

export default function AdminSupportPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Support"
        description="Access help and support resources"
      />

      <Card>
        <CardHeader>
          <CardTitle>Support Center</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Support options and resources will be displayed here.</p>
        </CardContent>
      </Card>
    </div>
  );
}
