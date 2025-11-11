"use client";
import { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import ChatSmileMessageIcon from './ChatSmileMessageIcon';
import { useAuth } from '@/contexts/AuthContext';
import dynamic from 'next/dynamic';

const TawkInline = dynamic(() => import('./TawkInline'), { ssr: false });
const MattermostEmbed = dynamic(() => import('./chat/MattermostEmbed'), { ssr: false });

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
        <div className="absolute bottom-16 right-0 w-[360px] sm:w-[520px] bg-white dark:bg-slate-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl overflow-hidden">
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

          {/* Single-window layout: left users list, right chat */}
          <div className="h-96 max-h-[70vh] flex">
            {/* Users rail */}
            <aside className="w-28 sm:w-36 border-r border-gray-200 dark:border-gray-700 bg-slate-900/70 text-slate-200 p-2 space-y-2">
              <button
                onClick={() => setSelected(null)}
                className={`w-full text-left px-2 py-2 rounded border text-sm ${
                  !selected ? 'bg-slate-800 border-slate-700' : 'bg-transparent border-slate-700'
                }`}
              >Spark Assistant</button>
              {users.map(u => (
                <button
                  key={u.id}
                  onClick={() => setSelected(u)}
                  className={`w-full text-left px-2 py-2 rounded border text-sm truncate ${
                    selected?.id === u.id ? 'bg-slate-800 border-slate-700' : 'bg-transparent border-slate-700'
                  }`}
                  title={u.name}
                >{u.name}</button>
              ))}
            </aside>
            {/* Chat area */}
            <div className="flex-1">
              <MattermostEmbed dmUsername={selected?.username} />
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
