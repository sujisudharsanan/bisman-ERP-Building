"use client";

import { useMemo, useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import dynamic from 'next/dynamic';
import BismanFloatingWidget from './BismanFloatingWidget';

// Dynamically import CleanChatInterface-NEW (Mira with sidebar) to avoid SSR issues
const CleanChatInterface = dynamic(() => import('./chat/CleanChatInterface-NEW'), { ssr: false });

// Guard that renders CleanChatInterface (Spark Assistant) only on private pages
export default function ChatGuard() {
  const pathname = usePathname() || '/';
  const { isAuthenticated } = useAuth();
  const [isChatOpen, setIsChatOpen] = useState(false);

  // Listen for spark:createTask event from dashboard Create button
  useEffect(() => {
    const handleCreateTask = () => {
      console.log('✨ External trigger for task creation - opening chat');
      setIsChatOpen(true);
    };

    window.addEventListener('spark:createTask', handleCreateTask);
    return () => window.removeEventListener('spark:createTask', handleCreateTask);
  }, []);

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

  return (
    <>
      {/* Floating Chat Button - Hidden when chat is open */}
      {!isChatOpen && (
        <BismanFloatingWidget
          onOpen={() => setIsChatOpen(true)}
          position="bottom-right"
          primaryColor="#0A3A63"
          accentColor="#FFC20A"
          hasNotification={false}
          size={72}
        />
      )}

      {/* Spark Assistant Chat Interface */}
      {isChatOpen && (
        <div className="fixed bottom-4 right-4 z-[999] w-[440px] h-[600px] shadow-2xl rounded-lg overflow-hidden animate-slide-in">
          <CleanChatInterface onClose={() => setIsChatOpen(false)} />
        </div>
      )}
    </>
  );
}
