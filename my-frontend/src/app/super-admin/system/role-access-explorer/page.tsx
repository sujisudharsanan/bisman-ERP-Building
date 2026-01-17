'use client';

import React from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';

export default function RoleAccessExplorerPage() {
  return (
    <div className="container mx-auto p-6">
      <PageHeader
        title="Role Access Explorer"
        description="Explore and manage role-based access permissions"
      />
      <Card>
        <CardHeader>
          <CardTitle>Access Explorer</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500 dark:text-gray-400">
            Role access explorer coming soon.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
