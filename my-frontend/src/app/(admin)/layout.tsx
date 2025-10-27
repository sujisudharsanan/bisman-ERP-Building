import AdminSidebar from '@/components/AdminSidebar';
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
        <AdminSidebar user={user} />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </ThemeProvider>
  );
}
