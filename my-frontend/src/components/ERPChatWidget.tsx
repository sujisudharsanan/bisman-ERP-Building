"use client";
import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import ChatSmileMessageIcon from './ChatSmileMessageIcon';
import { useAuth } from '@/contexts/AuthContext';
import dynamic from 'next/dynamic';

const TawkInline = dynamic(() => import('./TawkInline'), { ssr: false });
const MattermostEmbed = dynamic(() => import('./chat/MattermostEmbed'), { ssr: false });

export default function ERPChatWidget({ userName }: { userName?: string }) {
  const { user } = useAuth();
  if (!user) return null;
  const [open, setOpen] = useState(false);
  const [iconState, setIconState] = useState<'idle'|'attentive'|'listening'|'thinking'|'notify'>('idle');

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
        <div className="absolute bottom-16 right-0 w-[340px] sm:w-[420px] bg-white dark:bg-slate-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-yellow-600" />
                </div>
                <div className="font-semibold text-gray-900 dark:text-gray-100">Spark - Team Chat</div>
              </div>
              <button onClick={() => setOpen(false)} className="text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">Close</button>
            </div>
          </div>

          {/* Mattermost Team Chat */}
          <div className="h-96 max-h-[70vh]">
            <MattermostEmbed />
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
