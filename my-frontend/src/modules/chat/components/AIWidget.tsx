'use client';

import React, { useState } from 'react';
import { Send } from 'lucide-react';
import { toast } from 'sonner';

export default function ChatWidget() {
  const [text, setText] = useState('');
  const [answer, setAnswer] = useState('');
  const [thinking, setThinking] = useState(false);

  const send = async () => {
    if (!text.trim()) return;
    setThinking(true);
    setAnswer('');
    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: text })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'ai_error');
      setAnswer(String(data?.answer || ''));
    } catch (e: any) {
      toast.error(e?.message || 'AI is sleeping 😴… trying again!');
    } finally {
      setThinking(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-3">
      <div className="flex gap-2">
        <input
          className="flex-1 px-3 py-2 rounded-md bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600"
          placeholder="Ask anything… 😊"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
        />
        <button
          onClick={send}
          className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md inline-flex items-center"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>

      {thinking && (
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <span className="inline-block w-2 h-2 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.2s]" />
          <span className="inline-block w-2 h-2 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.1s]" />
          <span className="inline-block w-2 h-2 bg-indigo-500 rounded-full animate-bounce" />
          <span>Thinking… 💬</span>
        </div>
      )}

      {!!answer && (
        <div className="text-sm whitespace-pre-wrap text-gray-900 dark:text-gray-100">
          {answer}
        </div>
      )}
    </div>
  );
}
