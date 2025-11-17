"use client";
import { useEffect, useState, useRef } from 'react';
import { safeFetch } from '@/lib/safeFetch';
import { useAuth } from '@/contexts/AuthContext';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';

// Import Spark AI logic
import { getSparkAIResponse, loadUserERPData } from '@/utils/sparkAI';

// Import the new professional chat components
import ChatSidebar from './chat/ChatSidebar';
import ChatWindow from './chat/ChatWindow';
import { uploadFiles } from '@/lib/attachments';
import BismanFloatingWidget from './BismanFloatingWidget';

const TawkInline = dynamic(() => import('./TawkInline'), { ssr: false });

// Only Spark AI bot contact
const dummyContacts = [
  {
    id: 0, // Spark AI bot
    name: 'Spark Assistant',
    avatar: '/brand/chat-bot-icon.png',
    lastMessage: 'Hi! How can I help you today?',
    online: true,
  unread: 0,
  role: 'bot'
  }
];

const dummyMessages: Record<number, Array<{id: number; sender: string; text: string; time: string; isMine: boolean}>> = {
  0: [ // Spark AI welcome messages
    { id: 1, sender: 'Spark Assistant', text: 'Hello! ⚡ I\'m your Spark Assistant. How can I help you today?', time: '9:00 AM', isMine: false }
  ]
};

interface Message {
  id: number;
  sender: string;
  text: string;
  time: string;
  isMine: boolean;
}

export default function ERPChatWidget({ userName }: { userName?: string }) {
  const { user } = useAuth();
  if (!user) return null;
  
  const chatWindowRef = useRef<HTMLDivElement>(null);
  const chatButtonRef = useRef<HTMLButtonElement>(null);
  
  const [open, setOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [iconState, setIconState] = useState<'idle'|'attentive'|'listening'|'thinking'|'notify'>('idle');
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeContact, setActiveContact] = useState(0); // Spark AI bot active by default
  const [contacts, setContacts] = useState(dummyContacts);
  const [aiMessages, setAiMessages] = useState<Message[]>(dummyMessages[0] || []);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [userData, setUserData] = useState<any>(null); // ERP user data for Spark AI
  const [isFullScreen, setIsFullScreen] = useState(false);

  const currentContact = contacts.find(c => c.id === activeContact);
  // Use AI messages for bot (ID: 0)
  const currentMessages = activeContact === 0 ? aiMessages : (dummyMessages[activeContact] || []);

  // Load ERP user data for Spark AI
  useEffect(() => {
    loadUserERPData().then(data => setUserData(data));
  }, []);

  // Handle click outside to close chat
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Don't close if clicking the chat button or if chat is in fullscreen
      if (isFullScreen) return;
      
      const target = event.target as Node;
      if (
        open &&
        chatWindowRef.current &&
        chatButtonRef.current &&
        !chatWindowRef.current.contains(target) &&
        !chatButtonRef.current.contains(target)
      ) {
        setOpen(false);
        setIconState('idle');
      }
    };

    if (open && !isFullScreen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [open, isFullScreen]);

  // Internal messages feature removed: keep unread at 0 and avoid polling
  useEffect(() => {
    setUnreadCount(0);
  }, []);

  // Clear unread count when chat is opened
  useEffect(() => {
    if (open && unreadCount > 0) {
      setUnreadCount(0);
      setIconState('listening');
      // Messages endpoint removed; nothing to call
    }
  }, [open, unreadCount]);

  // Handle AI message sending (Spark AI integration)
  const handleSendMessage = async (messageText: string) => {
    if (activeContact !== 0) return; // Only Spark AI bot responds
    if (!messageText.trim()) return;

    const userMessage: Message = {
      id: Date.now(),
      sender: 'Me',
      text: messageText,
      time: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
      isMine: true
    };
    setAiMessages(prev => [...prev, userMessage]);
    setIsAiLoading(true);
    setIconState('thinking');
    try {
      const aiResponse = getSparkAIResponse(messageText, userData);
      const aiMessage: Message = {
        id: Date.now() + 1,
        sender: 'Spark Assistant',
        text: aiResponse,
        time: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
        isMine: false
      };
      setAiMessages(prev => [...prev, aiMessage]);
      setIconState('listening');
    } catch (error) {
      console.error('Spark AI Error:', error);
      const errorMessage: Message = {
        id: Date.now() + 1,
        sender: 'Spark Assistant',
        text: 'Sorry, I\'m having trouble processing that. Please try again! 😊',
        time: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
        isMine: false
      };
      setAiMessages(prev => [...prev, errorMessage]);
      setIconState('idle');
    } finally {
      setIsAiLoading(false);
    }
  };

  // Fullscreen controls
  const toggleFullScreen = () => {
    setIsFullScreen(prev => {
      const next = !prev;
      // Hide small panel when entering fullscreen; restore when exiting
      if (next) setOpen(false); else setOpen(true);
      return next;
    });
  };
  const handleClearChat = () => {
    setAiMessages([{ id: Date.now(), sender: 'Spark Assistant', text: 'Chat cleared. How can I help you now? ✨', time: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }), isMine: false }]);
  };
  const handleExportChat = () => {
    try {
      const blob = new Blob([JSON.stringify(aiMessages, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `spark-chat-${new Date().toISOString()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Export failed:', e);
    }
  };
  const handleFilesSelected = async (files: File[]) => {
    try {
      // For bot chat use a synthetic conversation id 'spark'
      await uploadFiles(files, 'chat', 'spark');
    } catch (e) {
      console.error('Chat upload failed', e);
    }
  };
  const handleOpenSettings = () => {
    alert('Settings coming soon.');
  };

  return (
    <div className="chat-widget-container">
      {/* Floating Chat Button - Hidden when chat is open */}
  {!open && (
        <BismanFloatingWidget
          onOpen={() => { setOpen(true); setIconState('listening'); }}
          position="bottom-right"
          primaryColor="#0A3A63"
          accentColor="#FFC20A"
          hasNotification={unreadCount > 0 || iconState === 'notify'}
          size={72}
        />
      )}

      {/* Chat Window - Normal floating or Docked at bottom */}
      {open && !isFullScreen && (
        <div 
          ref={chatWindowRef}
          className={isMinimized ? "chat-window-docked bg-white dark:bg-[#071018]" : "chat-window bg-white dark:bg-[#071018] rounded-lg shadow-2xl overflow-hidden animate-slide-in border border-gray-200 dark:border-slate-700"}
        >
          <div className="flex h-full w-full">
            <ChatSidebar
              contacts={contacts}
              activeContact={activeContact}
              onSelectContact={setActiveContact}
              onOpenSettings={handleOpenSettings}
            />
            <ChatWindow
              contact={currentContact}
              messages={currentMessages}
              onSendMessage={activeContact === 0 ? handleSendMessage : undefined}
              isLoading={activeContact === 0 ? isAiLoading : false}
              isFullScreen={false}
              onToggleFullScreen={toggleFullScreen}
              onFilesSelected={handleFilesSelected}
              onMinimize={() => setIsMinimized(!isMinimized)}
              onClose={() => setOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Fullscreen overlay */}
      {isFullScreen && (
        <div className="fixed inset-0 z-[1000] bg-white dark:bg-slate-900">
          <div className="flex h-full w-full items-stretch">
            <div className="border-r border-gray-200 dark:border-slate-700">
              <ChatSidebar
                contacts={contacts}
                activeContact={activeContact}
                onSelectContact={setActiveContact}
                wide
                onOpenSettings={handleOpenSettings}
              />
            </div>
            <div className="flex-1 min-w-0 flex flex-col">
              <ChatWindow
                contact={currentContact}
                messages={currentMessages}
                onSendMessage={activeContact === 0 ? handleSendMessage : undefined}
                isLoading={activeContact === 0 ? isAiLoading : false}
                isFullScreen={true}
                onToggleFullScreen={toggleFullScreen}
                onClearChat={handleClearChat}
                onExportChat={handleExportChat}
                onOpenSettings={handleOpenSettings}
                onFilesSelected={handleFilesSelected}
                onClose={() => setOpen(false)}
              />
            </div>
          </div>
        </div>
      )}
      
      {/* Lazy mount Tawk only when panel is open */}
      <TawkInline
        open={open}
        user={{
          userName: user?.name || (user as any)?.fullName || (user as any)?.username || undefined,
          userEmail: (user as any)?.email || undefined,
          accountId: (user as any)?.accountId || (user as any)?.tenantId || undefined,
        }}
      />
    </div>
  );
}
