import DynamicSidebar from '@/common/components/DynamicSidebar';
import { ThemeProvider } from '@/contexts/ThemeContext';

// Note: Auth protection is handled by client-side ProtectedRoute in pages
// Removed server-side getServerSession to avoid Prisma dependency issues in deployment
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex">
        <aside className="w-60 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-slate-900 min-h-screen p-0">
          <DynamicSidebar className="h-full" />
        </aside>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </ThemeProvider>
  );
}
