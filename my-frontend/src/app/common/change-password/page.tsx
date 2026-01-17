'use client';

import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';

export default function ChangePasswordPage() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader
        title="Change Password"
        description="Update your account password"
      />

      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>Update Password</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Password change form will be displayed here.</p>
        </CardContent>
      </Card>
    </div>
  );
}
