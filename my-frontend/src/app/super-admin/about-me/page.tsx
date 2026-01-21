'use client';

import React from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';

export default function SuperAdminAboutMePage() {
  return (
    <div className="w-full">
      <PageHeader
        title="About Me"
        description="Super admin profile and information"
      />
      <Card>
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500 dark:text-gray-400">
            Profile details coming soon.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
