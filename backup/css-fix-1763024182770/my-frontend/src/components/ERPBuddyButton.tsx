"use client";
import { useEffect, useMemo, useRef, useState } from 'react';
import { MessageSquare, Send, Smile, Sparkles } from 'lucide-react';
import BismanChatIcon from './BismanChatIcon';

type Msg = { id: string; role: 'user'|'assistant'; text: string; time: string };

export default function ERPBuddyButton({ userName }: { userName?: string }) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [iconState, setIconState] = useState<'idle'|'attentive'|'listening'|'thinking'|'notify'>('idle');
  const firstOpenToday = useRef(false);
  const nowStr = () => new Date().toLocaleTimeString();

  // Welcome popup on first login of the day
  useEffect(() => {
    try {
      const key = `erpbuddy-welcome-${new Date().toDateString()}`;
      if (!sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, '1');
        firstOpenToday.current = true;
        setOpen(true);
  enqueueAssistant(
          `👋 Hey ${userName || 'there'}! Happy to help! 😊\nWould you like to mark attendance now? I can also show your pending tasks, new mails, critical items and unread messages.`
        );
  setIconState('notify');
      }
    } catch {}
  }, [userName]);

  const suggestions = useMemo(() => ([
    '📦 Add a new task',
    '🧾 Show my pending tasks',
    '💰 Help me calculate GST',
  ]), []);

  const enqueueAssistant = (text: string) => {
    setMessages((m) => [...m, { id: crypto.randomUUID(), role: 'assistant', text, time: nowStr() }]);
  };
  const enqueueUser = (text: string) => {
    setMessages((m) => [...m, { id: crypto.randomUUID(), role: 'user', text, time: nowStr() }]);
  };

  const handleSend = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content) return;
  enqueueUser(content);
    setInput("");
  setTyping(true);
  setIconState('thinking');
    try {
      // call existing assistant API (generic route)
      const r = await fetch('/api/ai', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'askAI', prompt: content }) });
      const j = await r.json().catch(()=>({ ok:false }));
      const reply = j?.ok && j?.answer ? j.answer : `You're doing great so far 👍\nLet’s solve this together 🤝`;
  enqueueAssistant(reply);
  setIconState('notify');
    } catch {
      enqueueAssistant('I had trouble reaching AI right now. Try again in a moment.');
    } finally {
  setTyping(false);
  if (open) setIconState('idle');
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Floating Button */}
      <button
        onMouseEnter={() => setIconState('attentive')}
        onMouseLeave={() => setIconState('idle')}
        onClick={() => { setOpen((v) => { const next=!v; setIconState(next? 'listening':'idle'); return next; }); }}
        className="rounded-full"
        aria-label="Open ERP Buddy"
      >
        <BismanChatIcon state={iconState} unread={0} />
      </button>

      {/* Chat Window */}
      {open && (
        <div className="absolute bottom-16 right-0 w-[340px] sm:w-[380px] bg-white dark:bg-slate-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-yellow-600" />
              </div>
              <div className="font-semibold text-gray-900 dark:text-gray-100">Spark</div>
            </div>
            <button onClick={() => setOpen(false)} className="text-sm text-gray-600 dark:text-gray-300">Close</button>
          </div>

          {/* Messages */}
          <div className="h-72 p-3 space-y-3 overflow-y-auto bg-white/70 dark:bg-slate-900/50">
            {messages.map((m) => (
              <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`${m.role==='user' ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-slate-800 text-gray-900 dark:text-gray-100'} max-w-[80%] px-3 py-2 rounded-2xl ${m.role==='user' ? 'rounded-br-none' : 'rounded-bl-none'} shadow-sm`}> 
                  <div className="whitespace-pre-wrap text-sm">{m.text}</div>
                  <div className="text-[10px] opacity-70 mt-1">{m.time}</div>
                </div>
              </div>
            ))}
            {typing && (
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

          {/* Suggestions */}
          <div className="px-3 py-2 flex flex-wrap gap-2 border-t border-gray-200 dark:border-gray-700 bg-slate-50 dark:bg-slate-800">
            {suggestions.map((s) => (
              <button key={s} onClick={() => handleSend(s)} className="text-xs bg-white dark:bg-slate-900 border border-gray-200 dark:border-gray-700 rounded-full px-2 py-1 hover:bg-gray-50 dark:hover:bg-slate-800">
                {s}
              </button>
            ))}
          </div>

          {/* Input */}
          <div className="p-3 flex items-center gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSend(); }}
              placeholder="Ask anything…"
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
