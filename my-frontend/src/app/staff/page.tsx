'use client';

import React from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';

export default function StaffPage() {
  return (
    <div className="container mx-auto p-6">
      <PageHeader
        title="Staff Portal"
        description="Staff management and directory"
      />
      <Card>
        <CardHeader>
          <CardTitle>Staff Directory</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500 dark:text-gray-400">
            Staff portal features coming soon.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
