'use client';

import { ThemeProvider } from '@/components/ThemeProvider';
import DynamicSidebar from '@/common/components/DynamicSidebar';

// Admin layout with sidebar for admin pages
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <DynamicSidebar />
        <main className="lg:pl-64 min-h-screen">
          <div className="p-4 md:p-6 lg:p-8">
            {children}
          </div>
        </main>
      </div>
    </ThemeProvider>
  );
}
