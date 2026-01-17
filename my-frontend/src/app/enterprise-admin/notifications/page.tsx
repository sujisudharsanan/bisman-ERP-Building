'use client';

import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';

export default function EnterpriseNotificationsPage() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader
        title="Notifications"
        description="Manage enterprise notifications and alerts"
      />

      <Card>
        <CardHeader>
          <CardTitle>Notification Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Notification configuration will be displayed here.</p>
        </CardContent>
      </Card>
    </div>
  );
}
