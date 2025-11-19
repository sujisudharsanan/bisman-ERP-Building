"use client";
import { useCallback, useMemo, useRef, useState } from 'react';

export type ChatRole = 'user' | 'assistant' | 'system';
export type ChatMsg = { id: string; role: ChatRole; content: string; ts: number };
export type ChatMode = 'erp' | 'casual' | 'business' | 'calm';

function uuid() { try { return crypto.randomUUID(); } catch { return `${Date.now()}-${Math.random()}`; } }

const SYSTEM_PROMPTS: Record<ChatMode, string> = {
  erp: 'You are Spark, an ERP expert. Be concise, use Markdown. Ask a proactive follow-up.',
  casual: 'You are Spark. Friendly, brief, and helpful. Use Markdown and end with a follow-up question.',
  business: 'You are Spark, a business analyst. Structured, bullet points, concise. Proactive follow-up.',
  calm: 'You are Spark. Calm, reassuring, and pragmatic. Short answers, then a gentle follow-up question.',
};

export function useOllamaChat(initialMode: ChatMode = 'erp') {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<ChatMode>(initialMode);
  const abortRef = useRef<AbortController | null>(null);

  const systemMessage = useMemo<ChatMsg>(() => ({ id: uuid(), role: 'system', content: SYSTEM_PROMPTS[mode], ts: Date.now() }), [mode]);

  const send = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    // Inline commands: /mode erp|casual|business|calm
    if (trimmed.startsWith('/mode ')) {
      const m = trimmed.split(/\s+/)[1] as ChatMode | undefined;
      if (m && SYSTEM_PROMPTS[m]) setMode(m);
      setMessages((prev) => [...prev, { id: uuid(), role: 'assistant', content: `Mode set to ${m || 'unknown'}.`, ts: Date.now() }]);
      return;
    }

    const userMsg: ChatMsg = { id: uuid(), role: 'user', content: trimmed, ts: Date.now() };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    abortRef.current?.abort();
    abortRef.current = new AbortController();

    try {
      const r = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: trimmed, mode }),
        signal: abortRef.current.signal,
      });
      const j = await r.json().catch(() => ({}));
      if (j?.ok && j?.message?.content) {
        const a: ChatMsg = { id: uuid(), role: 'assistant', content: j.message.content, ts: Date.now() };
        setMessages((prev) => [...prev, a]);
      } else {
        const detail = j?.error ? ` (${String(j.error)})` : '';
        const a: ChatMsg = { id: uuid(), role: 'assistant', content: `AI is offline or unreachable${detail}. Please check AI configuration and try again.`, ts: Date.now() };
        setMessages((prev) => [...prev, a]);
      }
    } catch (e: any) {
      const a: ChatMsg = { id: uuid(), role: 'assistant', content: 'Network error talking to AI. Please try again shortly.', ts: Date.now() };
      setMessages((prev) => [...prev, a]);
    } finally {
      setLoading(false);
    }
  }, [messages, systemMessage]);

  const reset = useCallback(() => {
    setMessages([]);
  }, []);

  return { messages, loading, mode, setMode, send, reset };
}

export default useOllamaChat;
