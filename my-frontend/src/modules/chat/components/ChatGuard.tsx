"use client";

import { useMemo, useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import dynamic from 'next/dynamic';
import FloatingWidget from './FloatingWidget';
import { useChatContextOptional } from '../context/ChatContext';

// Dynamically import ChatInterface (Mira with sidebar) to avoid SSR issues
const CleanChatInterface = dynamic(() => import('./ChatInterface'), { ssr: false });

// Guard that renders CleanChatInterface (Spark Assistant) only on private pages
export default function ChatGuard() {
  const pathname = usePathname() || '/';
  const { isAuthenticated } = useAuth();
  const chatContext = useChatContextOptional();
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [missedCallCount, setMissedCallCount] = useState(0);

  // Get unread count from ChatContext (global state with persistence)
  const unreadMessageCount = chatContext?.totalUnreadCount || 0;

  // Listen for unread counts updates from ChatInterface (fallback for calls)
  useEffect(() => {
    const handleUnreadUpdate = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail.callCount !== undefined) {
        setMissedCallCount(detail.callCount);
      }
    };

    window.addEventListener('chat:unreadUpdate', handleUnreadUpdate);
    return () => window.removeEventListener('chat:unreadUpdate', handleUnreadUpdate);
  }, []);

  // Listen for spark:createTask event from dashboard Create button
  useEffect(() => {
    const handleCreateTask = () => {
      console.log('✨ External trigger for task creation - opening chat');
      setIsChatOpen(true);
    };

    window.addEventListener('spark:createTask', handleCreateTask);
    return () => window.removeEventListener('spark:createTask', handleCreateTask);
  }, []);

  // Listen for openTaskInChat event from dashboard task clicks
  // Only when chat is closed - when open, ChatInterface handles it directly
  useEffect(() => {
    if (isChatOpen) return; // Let ChatInterface handle it when chat is open
    
    const handleOpenTask = (e: Event) => {
      console.log('📋 Task click event received in ChatGuard - opening chat panel');
      const detail = (e as CustomEvent).detail;
      // Store pending task in sessionStorage for ChatInterface to pick up on mount
      if (detail && detail.id) {
        sessionStorage.setItem('pendingTaskOpen', JSON.stringify(detail));
      }
      setIsChatOpen(true);
      // Also dispatch internal event after a delay as backup
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('openTaskInChatInternal', { detail }));
      }, 350);
    };

    window.addEventListener('openTaskInChat', handleOpenTask);
    return () => window.removeEventListener('openTaskInChat', handleOpenTask);
  }, [isChatOpen]);

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

  const totalUnread = unreadMessageCount + missedCallCount;

  return (
    <>
      {/* Floating Chat Button - Hidden when chat is open */}
      {!isChatOpen && (
        <div className="fixed bottom-4 right-4 z-[9999]">
          <FloatingWidget
            onOpen={() => setIsChatOpen(true)}
            position="bottom-right"
            primaryColor="#0A3A63"
            accentColor="#FFC20A"
            hasNotification={totalUnread > 0}
            size={72}
          />
          {/* Unread count badge */}
          {totalUnread > 0 && (
            <div className="absolute -top-1 -right-1 min-w-[22px] h-[22px] px-1.5 bg-red-500 rounded-full flex items-center justify-center shadow-lg border-2 border-white pointer-events-none">
              <span className="text-white text-xs font-bold">
                {totalUnread > 99 ? '99+' : totalUnread}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Spark Assistant Chat Interface */}
      {isChatOpen && (
        <div className="fixed z-[999] shadow-2xl overflow-hidden animate-slide-in
          inset-0 sm:inset-auto sm:bottom-4 sm:right-4 sm:w-[440px] sm:h-[600px] sm:rounded-lg">
          <CleanChatInterface onClose={() => {
            setIsChatOpen(false);
            // Dispatch closeTaskPanel to restore dashboard layout
            window.dispatchEvent(new CustomEvent('closeTaskPanel'));
          }} />
        </div>
      )}
    </>
  );
}
