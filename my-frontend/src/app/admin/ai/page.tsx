'use client';

import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';

export default function AdminAIPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Management"
        description="Configure AI features and settings"
      />

      <Card>
        <CardHeader>
          <CardTitle>AI Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">AI settings and management tools will be displayed here.</p>
        </CardContent>
      </Card>
    </div>
  );
}
