import DynamicSidebar from '@/common/components/DynamicSidebar';
import { ThemeProvider } from '@/components/ThemeProvider';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import type { SessionUser } from '@/lib/permissions';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  const user: SessionUser | null = session
    ? {
        id: (session.user as any).id,
        email: session.user?.email || '',
        roles: ((session.user as any).roles || []) as any,
        memberships: ((session.user as any).memberships || []) as any,
      }
    : null;
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
