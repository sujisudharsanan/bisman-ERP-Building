"use client";
import { useEffect, useMemo, useRef, useState } from 'react';
import { Send, Sparkles } from 'lucide-react';
import ChatSmileMessageIcon from './ChatSmileMessageIcon';
import { ChatMsg, useOllamaChat } from '@/hooks/useOllamaChat';
import { useAuth } from '@/contexts/AuthContext';

export default function ERPChatWidget({ userName }: { userName?: string }) {
  const { user } = useAuth();
  if (!user) return null;
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [iconState, setIconState] = useState<'idle'|'attentive'|'listening'|'thinking'|'notify'>('idle');
  const { messages, loading, mode, setMode, send } = useOllamaChat('erp');
  const listRef = useRef<HTMLDivElement | null>(null);

  const suggestions = useMemo(() => [
    '🧾 Show my pending tasks',
    '📨 Any new mails today?',
    '⚠️ List today\'s critical items',
  ], []);

  useEffect(() => {
    if (!open) return;
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, open, loading]);

  const handleSend = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content) return;
    setInput('');
    setIconState('thinking');
    await send(content);
    setIconState('notify');
    if (open) setTimeout(() => setIconState('idle'), 400);
  };

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
        <div className="absolute bottom-16 right-0 w-[340px] sm:w-[380px] bg-white dark:bg-slate-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl overflow-hidden">
          <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-yellow-600" />
              </div>
              <div className="font-semibold text-gray-900 dark:text-gray-100">Spark</div>
              <div className="ml-2 text-xs text-gray-500 dark:text-gray-400">/mode {mode}</div>
            </div>
            <button onClick={() => setOpen(false)} className="text-sm text-gray-600 dark:text-gray-300">Close</button>
          </div>

          <div ref={listRef} className="h-72 p-3 space-y-3 overflow-y-auto bg-white/70 dark:bg-slate-900/50">
            {messages.map((m: ChatMsg) => (
              <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`${m.role==='user' ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-slate-800 text-gray-900 dark:text-gray-100'} max-w-[80%] px-3 py-2 rounded-2xl ${m.role==='user' ? 'rounded-br-none' : 'rounded-bl-none'} shadow-sm`}>
                  <div className="whitespace-pre-wrap text-sm">{m.content}</div>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 dark:bg-slate-800 text-gray-900 dark:text-gray-100 px-3 py-2 rounded-2xl rounded-bl-none shadow-sm">
                  <div className="flex gap-1 items-center">
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-200ms]"></span>
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-100ms]"></span>
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="px-3 py-2 flex flex-wrap gap-2 border-t border-gray-200 dark:border-gray-700 bg-slate-50 dark:bg-slate-800">
            {suggestions.map((s) => (
              <button key={s} onClick={() => handleSend(s)} className="text-xs bg-white dark:bg-slate-900 border border-gray-200 dark:border-gray-700 rounded-full px-2 py-1 hover:bg-gray-50 dark:hover:bg-slate-800">
                {s}
              </button>
            ))}
          </div>

          <div className="p-3 flex items-center gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSend(); }}
              placeholder="Ask anything… (/mode erp|casual|business|calm)"
              className="flex-1 border border-gray-200 dark:border-gray-700 rounded-full px-3 py-2 text-sm bg-white dark:bg-slate-900"
            />
            <button onClick={() => handleSend()} className="p-2 rounded-full bg-indigo-600 text-white shadow hover:bg-indigo-700">
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
