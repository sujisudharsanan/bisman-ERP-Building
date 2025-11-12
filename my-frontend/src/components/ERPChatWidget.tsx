"use client";
import { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import ChatSmileMessageIcon from './ChatSmileMessageIcon';
import { useAuth } from '@/contexts/AuthContext';
import dynamic from 'next/dynamic';

const TawkInline = dynamic(() => import('./TawkInline'), { ssr: false });
const CleanChatInterface = dynamic(() => import('./chat/CleanChatInterface'), { ssr: false });

type ChatUser = { id: string; name: string; username?: string };

export default function ERPChatWidget({ userName }: { userName?: string }) {
  const { user } = useAuth();
  if (!user) return null;
  const [open, setOpen] = useState(false);
  const [users, setUsers] = useState<ChatUser[]>([]);
  const [selected, setSelected] = useState<ChatUser | null>(null);
  const [iconState, setIconState] = useState<'idle'|'attentive'|'listening'|'thinking'|'notify'>('idle');

  // Optional: hydrate users list from your API; safe no-op if endpoint missing
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch('/api/users/chat'); // optional endpoint
        if (!r.ok) return;
        const data = await r.json();
        if (!cancelled && Array.isArray(data)) setUsers(data);
      } catch {}
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <button
        onMouseEnter={() => setIconState('attentive')}
        onMouseLeave={() => setIconState('idle')}
        onClick={() => { setOpen(v => { const n = !v; setIconState(n? 'listening':'idle'); return n; }); }}
        className="rounded-full"
        aria-label="Open Spark"
      >
        <ChatSmileMessageIcon state={iconState} size={60} />
      </button>

      {open && (
        <div className="absolute bottom-16 right-0 w-[360px] sm:w-[620px] lg:w-[800px] bg-white dark:bg-slate-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div className="font-semibold text-white">Spark - Team Chat</div>
              </div>
              <button 
                onClick={() => setOpen(false)} 
                className="text-sm text-white/80 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Clean Chat Interface - No Mattermost branding */}
          <div className="h-[500px] max-h-[70vh]">
            <CleanChatInterface />
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
