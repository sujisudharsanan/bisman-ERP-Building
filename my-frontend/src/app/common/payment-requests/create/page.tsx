'use client';

import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';

export default function CreatePaymentRequestPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Create Payment Request"
        description="Submit a new payment request"
      />

      <Card>
        <CardHeader>
          <CardTitle>Payment Request Form</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Payment request form will be displayed here.</p>
        </CardContent>
      </Card>
    </div>
  );
}
