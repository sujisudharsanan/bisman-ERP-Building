import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import '../styles/globals.css';
import { AuthProvider } from '../contexts/AuthContext';
import { PermissionProvider } from '../contexts/PermissionContext';
import LogoutButton from '@/components/ui/LogoutButton';
import { useEffect } from 'react';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'BISMAN ERP - Super Admin Dashboard',
  description: 'Comprehensive ERP system with RBAC support',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Persist last git info into localStorage for quick diagnostics
  useEffect(() => {
    async function persistGitInfo() {
      try {
        const base = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';
        const res = await fetch(`${base}/api/git/info`, { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        if (data && data.commit) {
          localStorage.setItem('git:lastCommit', JSON.stringify(data));
        }
      } catch {}
    }
    if (typeof window !== 'undefined') persistGitInfo();
  }, []);
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          <PermissionProvider>
            {children}
            {/* Global logout button: fixed at top-right for desktop, hides on /login */}
            <LogoutButton position="top-right" variant="minimal" hideOnLogin={true} />
          </PermissionProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
