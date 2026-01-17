'use client';

import React from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';

export default function HRUserCreationPage() {
  return (
    <div className="container mx-auto p-6">
      <PageHeader
        title="User Creation"
        description="Create new user accounts in the HR system"
      />
      <Card>
        <CardHeader>
          <CardTitle>Create New User</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500 dark:text-gray-400">
            User creation form coming soon.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
