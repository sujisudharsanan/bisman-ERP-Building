'use client';

import React from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';

export default function SystemClientsPage() {
  return (
    <div className="w-full p-6">
      <PageHeader
        title="System Clients"
        description="Manage system clients and configurations"
      />
      <Card>
        <CardHeader>
          <CardTitle>Clients Management</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500 dark:text-gray-400">
            System clients management coming soon.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
