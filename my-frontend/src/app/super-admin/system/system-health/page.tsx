'use client';

import React from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';

export default function SystemHealthPage() {
  return (
    <div className="w-full">
      <PageHeader
        title="System Health"
        description="Monitor system health and performance metrics"
      />
      <Card>
        <CardHeader>
          <CardTitle>Health Dashboard</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500 dark:text-gray-400">
            System health monitoring coming soon.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
