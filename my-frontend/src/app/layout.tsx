import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import '../styles/globals.css';
import './tawk-inline.css';
import React from 'react';
import ClientLayout from '@/components/ClientLayout';

// Force all pages to be dynamically rendered (bypass static generation errors)
export const dynamic = 'force-dynamic';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'BISMAN ERP - Dashboard',
  description: 'Comprehensive ERP system with RBAC support',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100 transition-colors duration-300`}>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
