import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import '../styles/globals.css';
import { AuthProvider } from '../contexts/AuthContext';
import { PermissionProvider } from '../contexts/PermissionContext';
import LogoutButton from '@/components/ui/LogoutButton';

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
