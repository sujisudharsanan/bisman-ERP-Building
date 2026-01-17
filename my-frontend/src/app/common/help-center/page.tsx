'use client';

import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { FiHelpCircle, FiBook, FiMessageCircle, FiMail } from 'react-icons/fi';

export default function HelpCenterPage() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader
        title="Help Center"
        description="Find answers and get support"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <CardHeader className="flex flex-row items-center gap-4">
            <FiBook className="h-8 w-8 text-blue-500" />
            <div>
              <CardTitle>Documentation</CardTitle>
              <p className="text-sm text-muted-foreground">Browse guides and tutorials</p>
            </div>
          </CardHeader>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <CardHeader className="flex flex-row items-center gap-4">
            <FiHelpCircle className="h-8 w-8 text-green-500" />
            <div>
              <CardTitle>FAQs</CardTitle>
              <p className="text-sm text-muted-foreground">Frequently asked questions</p>
            </div>
          </CardHeader>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <CardHeader className="flex flex-row items-center gap-4">
            <FiMessageCircle className="h-8 w-8 text-purple-500" />
            <div>
              <CardTitle>Live Chat</CardTitle>
              <p className="text-sm text-muted-foreground">Chat with support team</p>
            </div>
          </CardHeader>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <CardHeader className="flex flex-row items-center gap-4">
            <FiMail className="h-8 w-8 text-orange-500" />
            <div>
              <CardTitle>Email Support</CardTitle>
              <p className="text-sm text-muted-foreground">Submit a support ticket</p>
            </div>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
}
