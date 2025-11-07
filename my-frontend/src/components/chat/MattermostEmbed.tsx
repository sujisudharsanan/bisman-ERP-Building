"use client";
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export default function MattermostEmbed() {
  const { user } = useAuth();
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState<'team'|'dm'|'support'>('team');
  const [src, setSrc] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      if (!user?.email) return;
      setError(null);
    // 1) Provision (with role for RBAC-aware channel membership)
  await fetch('/api/mattermost/provision', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ user: { id: (user as any).id, email: (user as any).email, name: (user as any).name || (user as any).fullName || (user as any).username, role: (user as any).role || (user as any).roleName } }) });
      // 2) Login (requires stored password in real setup; for demo read from env/placeholder)
      const demoPass = process.env.NEXT_PUBLIC_MM_DEMO_PASSWORD || 'changeme-demo-only';
      const lr = await fetch('/api/mattermost/login', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ email: user.email, password: demoPass }) });
      if (lr.ok) {
        // Touch the root to allow MM to set any additional cookies via the /chat proxy
        await fetch('/chat');
        // compute initial path
        let initial = buildPath('team');
        try { const r = await fetch(initial, { method: 'GET' }); if (!r.ok) initial = '/chat'; } catch { initial = '/chat'; }
        setSrc(initial);
        setReady(true);
      } else {
        setError('Could not log into Mattermost. Is the server running?');
      }
    })();
  }, [user?.email]);

  function buildPath(t: 'team'|'dm'|'support') {
    const base = '/chat';
    const team = process.env.NEXT_PUBLIC_MM_TEAM_SLUG || 'erp';
    switch (t) {
      case 'dm': return `${base}/${team}/messages/@`;
      case 'support': return `${base}/${team}/channels/customer-support`;
      default: return `${base}/${team}/channels/town-square`;
    }
  }

  useEffect(() => {
    (async () => {
      if (!ready) return;
      let target = buildPath(tab);
      try { const r = await fetch(target, { method: 'GET' }); if (!r.ok) target = '/chat'; } catch { target = '/chat'; }
      setSrc(target);
    })();
  }, [tab, ready]);

  if (!user) return null;

  return (
    <div className="flex flex-col h-[480px] min-h-[420px] max-h-[75vh]">
      <div className="flex gap-2 p-2 border-b border-gray-200 dark:border-gray-700">
        {/* Basic role-based tab visibility */}
        {['SUPER_ADMIN','ENTERPRISE_ADMIN','ADMIN'].includes(String((user as any)?.role || (user as any)?.roleName).toUpperCase()) && (
          <button className={`text-xs px-2 py-1 rounded ${tab==='team'?'bg-indigo-600 text-white':'bg-gray-100 dark:bg-gray-800'}`} onClick={()=>setTab('team')}>Team Chat</button>
        )}
        {/* DMs allowed for all */}
        <button className={`text-xs px-2 py-1 rounded ${tab==='dm'?'bg-indigo-600 text-white':'bg-gray-100 dark:bg-gray-800'}`} onClick={()=>setTab('dm')}>Direct Messages</button>
        {/* Support visible to staff and admins */}
        {['SUPER_ADMIN','ENTERPRISE_ADMIN','ADMIN','STAFF'].includes(String((user as any)?.role || (user as any)?.roleName).toUpperCase()) && (
          <button className={`text-xs px-2 py-1 rounded ${tab==='support'?'bg-indigo-600 text-white':'bg-gray-100 dark:bg-gray-800'}`} onClick={()=>setTab('support')}>Customer Support</button>
        )}
        <a href="/chat" target="_blank" rel="noreferrer" className="ml-auto text-xs text-indigo-600 hover:underline">Open full chat ↗</a>
      </div>
      {ready ? (
        <iframe src={src} className="flex-1 w-full h-full" style={{ border:0 }} title="Mattermost" allow="clipboard-read; clipboard-write" />
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-sm text-gray-600 dark:text-gray-400">
          {error ? (
            <>
              <div className="mb-2">{error}</div>
              <div className="mb-3">Start Docker Desktop and run: <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">npm run dev:mm</code></div>
              <button onClick={()=>{ setReady(false); setError(null); setSrc(''); setTab('team'); }} className="px-2 py-1 text-xs bg-gray-200 dark:bg-gray-700 rounded">Retry</button>
            </>
          ) : (
            <>Preparing chat…</>
          )}
        </div>
      )}
    </div>
  );
}
