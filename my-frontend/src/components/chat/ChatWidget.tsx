"use client";

import React, { useState, useRef, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { FiMessageCircle, FiSend, FiX } from "react-icons/fi";

export type ChatMessage = { id: string; role: "user" | "assistant"; text: string };

// Note: This newer ChatWidget is currently not mounted. The app uses ERPChatWidget instead per legacy config.
export default function ChatWidget() {
  const { user } = useAuth();
  const enabled = typeof window === 'undefined' ? true : (String(process.env.NEXT_PUBLIC_ENABLE_CHAT_AI || 'true').toLowerCase() !== 'false');
  if (!user || !enabled) return null;
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    requestAnimationFrame(() => listRef.current?.scrollTo({ top: 999999 }));
  }, [open, messages.length]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    const userMsg: ChatMessage = { id: crypto.randomUUID(), role: "user", text };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [...messages, userMsg].map(m => ({ role: m.role, content: m.text })) }),
      });
      const data = await res.json().catch(() => ({}));
      const reply = typeof data?.reply === "string" ? data.reply : "I received your message.";
      setMessages(prev => [...prev, { id: crypto.randomUUID(), role: "assistant", text: reply }]);
    } catch {
      setMessages(prev => [...prev, { id: crypto.randomUUID(), role: "assistant", text: "Sorry, I couldn't reach the AI right now." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed z-[60] right-4 bottom-4">
      {!open && (
        <button
          aria-label="Open Chat AI"
          onClick={() => setOpen(true)}
          className="shadow-lg rounded-full w-12 h-12 flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white"
          title="Chat AI"
        >
          <FiMessageCircle className="w-6 h-6" />
        </button>
      )}
      {open && (
        <div className="w-[320px] h-[420px] rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-xl flex flex-col">
          <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-gray-700">
            <div className="text-sm font-semibold">Chat AI</div>
            <button onClick={() => setOpen(false)} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800" aria-label="Close chat"><FiX className="w-4 h-4" /></button>
          </div>
          <div ref={listRef} className="flex-1 overflow-y-auto p-3 space-y-2">
            {messages.length === 0 && (
              <div className="text-xs text-gray-500">Ask anything about this page.</div>
            )}
            {messages.map(m => (
              <div key={m.id} className={`max-w-[85%] text-xs px-2 py-1.5 rounded ${m.role === "user" ? "ml-auto bg-blue-600 text-white" : "mr-auto bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100"}`}>
                {m.text}
              </div>
            ))}
          </div>
          <form
            onSubmit={e => { e.preventDefault(); send(); }}
            className="p-2 border-t border-gray-200 dark:border-gray-700 flex items-center gap-2"
          >
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 text-xs px-2 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button type="submit" disabled={loading || !input.trim()} className="inline-flex items-center justify-center w-9 h-9 rounded bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50" aria-label="Send">
              <FiSend className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
