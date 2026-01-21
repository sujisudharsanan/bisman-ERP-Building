'use client';

import React from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';

export default function ITAdminPage() {
  return (
    <div className="w-full">
      <PageHeader
        title="IT Administration"
        description="IT infrastructure and system administration"
      />
      <Card>
        <CardHeader>
          <CardTitle>IT Admin Console</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500 dark:text-gray-400">
            IT administration features coming soon.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
