// useChat.js - React hook for single-window chat
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuthConfig } from "../context/AuthConfigContext";
import { createChatClient, sendMessage, health } from "../services/chat";

export function useChat({ chatBase, usersProvider } = {}) {
  const { getAuthToken } = useAuthConfig();

  const client = useMemo(() => createChatClient({ baseURL: chatBase || process.env.REACT_APP_CHAT_BASE || process.env.VITE_CHAT_BASE, getAuthToken }), [chatBase, getAuthToken]);

  const [messages, setMessages] = useState([]); // {role: 'user'|'assistant', content}
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [users, setUsers] = useState([]); // sidebar list
  const [activeUserId, setActiveUserId] = useState(null); // null => bot

  useEffect(() => {
    let mounted = true;
    (async () => {
      try { await health(client); } catch {}
      if (mounted && typeof usersProvider === 'function') {
        const list = await usersProvider();
        setUsers(list || []);
      }
    })();
    return () => { mounted = false; };
  }, [client, usersProvider]);

  const send = useCallback(async (text) => {
    setLoading(true); setError(null);
    const token = await getAuthToken?.();
    const uid = activeUserId || "bot";
    setMessages(prev => [...prev, { role: 'user', content: text }]);
    try {
      const data = await sendMessage(client, { query: text, userId: uid, token });
      setMessages(prev => [...prev, { role: 'assistant', content: data?.response || '' }]);
      return data;
    } catch (e) {
      setError(e);
      setMessages(prev => [...prev, { role: 'assistant', content: "Sorry, I can't respond right now." }]);
      throw e;
    } finally {
      setLoading(false);
    }
  }, [client, activeUserId, getAuthToken]);

  return { client, users, activeUserId, setActiveUserId, messages, send, loading, error };
}
