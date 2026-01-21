'use client';

import React from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';

export default function SystemSettingsPage() {
  return (
    <div className="w-full">
      <PageHeader
        title="System Settings"
        description="Configure system-wide settings and preferences"
      />
      <Card>
        <CardHeader>
          <CardTitle>Settings Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500 dark:text-gray-400">
            System settings configuration coming soon.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
