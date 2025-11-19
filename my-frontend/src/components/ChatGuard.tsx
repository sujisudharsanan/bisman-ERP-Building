"use client";

import { useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import ERPChatWidget from './ERPChatWidget';

// Guard that renders ERPChatWidget only on private pages
export default function ChatGuard() {
  const pathname = usePathname() || '/';
  const { isAuthenticated } = useAuth();

  // Define public paths: auth pages and common entry screens
  const isPublic = useMemo(() => {
    const exactPublic = new Set<string>([
      '/',
      '/auth/login',
      '/auth/register',
      '/login',
      '/register',
    ]);
    if (exactPublic.has(pathname)) return true;
    return (
      pathname.startsWith('/auth') ||
      pathname.startsWith('/public')
    );
  }, [pathname]);

  if (!isAuthenticated) return null; // never show when not logged in
  if (isPublic) return null; // hide on public pages even if logged in

  return <ERPChatWidget />;
}
