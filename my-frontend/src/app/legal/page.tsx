'use client';

import React from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';

export default function LegalPage() {
  return (
    <div className="container mx-auto p-6">
      <PageHeader
        title="Legal"
        description="Legal documents and compliance management"
      />
      <Card>
        <CardHeader>
          <CardTitle>Legal Management</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500 dark:text-gray-400">
            Legal management features coming soon.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
