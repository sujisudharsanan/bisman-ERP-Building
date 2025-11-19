import { ThemeProvider } from '@/components/ThemeProvider';
import type { ReactNode } from 'react';

export default function EnterpriseLayout({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 p-6">{children}</div>
    </ThemeProvider>
  );
}
