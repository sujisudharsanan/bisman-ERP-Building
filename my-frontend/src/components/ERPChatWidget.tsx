"use client";
import { useEffect, useState } from 'react';
import { safeFetch } from '@/lib/safeFetch';
import { useAuth } from '@/contexts/AuthContext';
import dynamic from 'next/dynamic';

// Import Spark AI logic
import { getSparkAIResponse, loadUserERPData } from '@/utils/sparkAI';

// Import the new professional chat components
import ChatSidebar from './chat/ChatSidebar';
import ChatWindow from './chat/ChatWindow';
import { uploadFiles } from '@/lib/attachments';

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
  
  const [open, setOpen] = useState(false);
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
      <button
        onMouseEnter={() => setIconState('attentive')}
        onMouseLeave={() => unreadCount > 0 ? setIconState('notify') : setIconState('idle')}
        onClick={() => { setOpen(v => { const n = !v; setIconState(n? 'listening':'idle'); return n; }); }}
        className={`rounded-full transition-all duration-300 relative ${
          iconState === 'attentive' ? 'scale-110 shadow-2xl' : 'shadow-xl'
        } ${iconState === 'notify' ? 'animate-bounce' : ''} hover:scale-110`}
        aria-label="Open Chat"
      >
        <div className={`relative w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 p-3 ${
          iconState === 'thinking' ? 'animate-spin' : ''
        } ${iconState === 'listening' ? 'animate-pulse' : ''}`}>
          <img 
            src="/brand/chat-bot-icon.png" 
            alt="Chat Bot" 
            className="w-full h-full object-contain filter brightness-0 invert"
            onError={(e) => {
              // Fallback if image doesn't load
              const target = e.currentTarget;
              target.style.display = 'none';
              const parent = target.parentElement;
              if (parent) {
                const fallback = document.createElement('div');
                fallback.className = 'w-full h-full flex items-center justify-center text-white text-2xl';
                fallback.textContent = '💬';
                parent.replaceChildren(fallback);
              }
            }}
          />
        </div>
        
        {/* Unread Badge */}
        {unreadCount > 0 && (
          <div className="absolute -top-1 -right-1 min-w-[24px] h-6 px-1.5 bg-red-600 text-white text-xs font-bold rounded-full flex items-center justify-center shadow-lg border-2 border-white animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </div>
        )}
      </button>

      {/* Professional Chat Interface */}
      {open && (
        <div className="chat-window bg-white dark:bg-slate-900 rounded-lg shadow-2xl overflow-hidden animate-slide-in border border-gray-200 dark:border-slate-700">
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
