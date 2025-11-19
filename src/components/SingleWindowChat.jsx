// SingleWindowChat.jsx - Left users list, right chat pane
import React, { useMemo, useRef } from "react";
import { useChat } from "../hooks/useChat";

export default function SingleWindowChat({ usersProvider, chatBase }) {
  const { users, activeUserId, setActiveUserId, messages, send, loading, error } = useChat({ usersProvider, chatBase });
  const inputRef = useRef(null);

  const onSend = async (e) => {
    e.preventDefault();
    const val = inputRef.current?.value?.trim();
    if (!val) return;
    await send(val);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', height: '100%', background: '#0f172a', color: '#e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
      <aside style={{ background: '#0b1220', borderRight: '1px solid #1f2937', padding: 12 }}>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>Chats</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <button onClick={() => setActiveUserId(null)} style={{ textAlign: 'left', padding: '8px 10px', background: activeUserId === null ? '#111827' : 'transparent', border: '1px solid #1f2937', color: '#e5e7eb', borderRadius: 6 }}>Mattermost Bot</button>
          {users.map(u => (
            <button key={u.id} onClick={() => setActiveUserId(u.id)} style={{ textAlign: 'left', padding: '8px 10px', background: activeUserId === u.id ? '#111827' : 'transparent', border: '1px solid #1f2937', color: '#d1d5db', borderRadius: 6 }}>
              {u.name}
            </button>
          ))}
        </div>
      </aside>

      <section style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
          {messages.length === 0 && (
            <div style={{ opacity: 0.7 }}>Start chatting — select a user or talk to the bot.</div>
          )}
          {messages.map((m, i) => (
            <div key={i} style={{ margin: '8px 0', display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
              <div style={{ maxWidth: '70%', padding: '8px 12px', borderRadius: 10, background: m.role === 'user' ? '#334155' : '#1f2937' }}>{m.content}</div>
            </div>
          ))}
        </div>
        <form onSubmit={onSend} style={{ display: 'flex', gap: 8, padding: 12, borderTop: '1px solid #1f2937' }}>
          <input ref={inputRef} placeholder="Type a message" style={{ flex: 1, padding: '10px 12px', background: '#0b1220', color: '#e5e7eb', border: '1px solid #1f2937', borderRadius: 8 }} />
          <button type="submit" disabled={loading} style={{ padding: '10px 14px', background: '#3b82f6', color: 'white', border: 0, borderRadius: 8 }}>{loading ? 'Sending…' : 'Send'}</button>
        </form>
        {error && <div style={{ color: '#ef4444', padding: '4px 12px' }}>{String(error?.message || error)}</div>}
      </section>
    </div>
  );
}
