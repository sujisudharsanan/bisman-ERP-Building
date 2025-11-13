"use client";
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export default function MattermostEmbed({ dmUsername }: { dmUsername?: string }) {
  const { user } = useAuth();
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState<'team'|'dm'|'support'>(dmUsername ? 'dm' : 'team');
  const [src, setSrc] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [errorDetail, setErrorDetail] = useState<any>(null);
  const [health, setHealth] = useState<any>(null);
  const [retryCount, setRetryCount] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const maxRetries = 3;

  // Inject white-label CSS and replace Mattermost mentions with "Spark" inside the proxied app
  function injectBranding() {
    try {
      const doc = iframeRef.current?.contentDocument || iframeRef.current?.contentWindow?.document;
      if (!doc) return;
      const style = doc.createElement('style');
      style.setAttribute('data-spark-branding', '1');
      style.innerHTML = `
        /* Hide common Mattermost branding areas */
        [alt*="Mattermost"], img[src*="mattermost"], a[href*="mattermost"],
        .TeamSidebar .TeamName, .sidebar-header__info .TeamName,
        .announcement-bar, .SidebarHeader .TeamName, .app__body .sidebar--left .team__header { display: none !important; }
      `;
      if (!doc.head?.querySelector('style[data-spark-branding]')) doc.head?.appendChild(style);

      // Replace visible text nodes containing "Mattermost" with "Spark"
      const replace = (root: Element | Document) => {
        const walker = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT);
        const nodes: Node[] = [];
        while (walker.nextNode()) nodes.push(walker.currentNode);
        nodes.forEach(n => {
          const t = n.nodeValue || '';
          if (t.includes('Mattermost')) n.nodeValue = t.replace(/Mattermost/g, 'Spark');
        });
      };
      replace(doc.body);
      // Re-apply after SPA route changes (simple delay-based re-run)
      setTimeout(() => { try { replace(doc.body); } catch {} }, 800);
    } catch {}
  }

  useEffect(() => {
    (async () => {
      if (!user?.email) return;
      setError(null);
      setErrorDetail(null);
      
      // Quick health check to surface upstream issues
      try { 
        const h = await fetch('/api/mattermost/health', { cache:'no-store' }); 
        setHealth(await h.json().catch(()=>null)); 
      } catch {}
      
      // 1) Provision (with role for RBAC-aware channel membership)
      await fetch('/api/mattermost/provision', { 
        method:'POST', 
        headers:{'Content-Type':'application/json'}, 
        body: JSON.stringify({ 
          user: { 
            id: (user as any).id, 
            email: (user as any).email, 
            name: (user as any).name || (user as any).fullName || (user as any).username, 
            role: (user as any).role || (user as any).roleName 
          } 
        }) 
      });
      
      // 2) Login (use stored password from env - in production, use secure credential store)
      const demoPass = process.env.NEXT_PUBLIC_MM_DEMO_PASSWORD || 'Welcome@2025';
      let lr = await fetch('/api/mattermost/login', { 
        method:'POST', 
        headers:{'Content-Type':'application/json'}, 
        body: JSON.stringify({ email: user.email, password: demoPass }),
        credentials: 'include' // Ensure cookies are sent/received
      });
      
      if (!lr.ok) {
        // Fallback attempt with alternate password
        const alt = demoPass === 'Welcome@2025' ? 'changeme-demo-only' : 'Welcome@2025';
        lr = await fetch('/api/mattermost/login', { 
          method:'POST', 
          headers:{'Content-Type':'application/json'}, 
          body: JSON.stringify({ email: user.email, password: alt }),
          credentials: 'include'
        });
      }
      
      // If still unauthorized due to lockout, try admin unlock flow once
      if (!lr.ok) {
        const info = await lr.json().catch(async () => ({ status: lr.status, text: await lr.text().catch(()=> '') }));
        const locked = (info?.error?.includes('mm_login_401') || lr.status === 401) && String(info?.snippet || info?.text || '').includes('too_many');
        if (locked) {
          try {
            await fetch('/api/mattermost/admin/unlock', { 
              method: 'POST', 
              headers: { 'Content-Type': 'application/json' }, 
              body: JSON.stringify({ email: user.email }),
              credentials: 'include'
            });
            // Small delay before retry
            await new Promise(r => setTimeout(r, 800));
            lr = await fetch('/api/mattermost/login', { 
              method:'POST', 
              headers:{'Content-Type':'application/json'}, 
              body: JSON.stringify({ email: user.email, password: demoPass }),
              credentials: 'include'
            });
          } catch (unlockErr) {
            console.error('[MattermostEmbed] Unlock failed:', unlockErr);
          }
        }
      }
      if (lr.ok) {
        // Login succeeded! Check health and load iframe
        const healthCheck = await fetch('/api/mattermost/health', { cache: 'no-store' }).catch(() => null);
        const healthOk = healthCheck?.ok;
        
        if (healthOk) {
          // Using /chat proxy (same-origin) so cookies work in both dev and production
          // Next.js rewrites /chat/* to MM_BASE_URL/* (Railway/local Mattermost)
          const initial = buildPath('team');
          
          // CRITICAL: Ensure we never set src to empty or '/' which would load the dashboard
          if (!initial || initial === '/' || initial === '') {
            console.error('[MattermostEmbed] Invalid path generated:', initial);
            setError('Chat configuration error');
            setErrorDetail({ message: 'Invalid chat path. Check NEXT_PUBLIC_MM_TEAM_SLUG environment variable.' });
            return;
          }
          
          if (process.env.NODE_ENV !== 'production') {
            console.log('[MattermostEmbed] ✅ Login OK, loading iframe:', initial);
          }
          
          // Small delay to ensure cookies are fully set before iframe loads
          await new Promise(r => setTimeout(r, 300));
          setSrc(initial);
          setReady(true);
        } else {
          const isDev = process.env.NODE_ENV === 'development';
          setError('Mattermost service is not running or not reachable.');
          setErrorDetail({ 
            message: isDev 
              ? 'Health check failed. For local dev, install Docker Desktop and run: npm run dev:mm' 
              : 'Mattermost service unavailable. Please contact support.',
            health,
            configured_url: isDev ? (process.env.NEXT_PUBLIC_MM_BASE_URL || process.env.MM_BASE_URL || 'Not configured') : undefined
          });
        }
      } else {
        const info = await lr.json().catch(async () => ({ status: lr.status, text: await lr.text().catch(()=> '') }));
        const isDev = process.env.NODE_ENV === 'development';
        setError(isDev ? 'Could not log into Mattermost.' : 'Authentication failed.');
        setErrorDetail(isDev ? info : { status: info.status }); // Hide details in production
      }
    })();
  }, [user?.email]);

  function buildPath(t: 'team'|'dm'|'support') {
    const base = '/chat';
    const team = process.env.NEXT_PUBLIC_MM_TEAM_SLUG || 'erp';
    switch (t) {
      case 'dm': return dmUsername ? `${base}/${team}/messages/@${dmUsername}` : `${base}/${team}/messages/@`;
      case 'support': return `${base}/${team}/channels/customer-support`;
      default: return `${base}/${team}/channels/town-square`;
    }
  }

  useEffect(() => {
    if (!ready) return;
    // Update iframe source directly when tab changes (don't pre-fetch HTML)
    const target = buildPath(tab);
    setSrc(target);
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
  <a href="/chat" target="_blank" rel="noreferrer" className="ml-auto text-xs text-indigo-600 hover:underline">Open chat ↗</a>
      </div>
      {ready && src && src !== '/' && src.startsWith('/chat') ? (
  <iframe ref={iframeRef} src={src} className="flex-1 w-full h-full" style={{ border:0 }} title="Team Chat" allow="clipboard-read; clipboard-write" onLoad={injectBranding} />
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-sm text-gray-600 dark:text-gray-400 p-4">
          {error ? (
            <>
              <div className="mb-2 text-center px-4">{error}</div>
              {process.env.NODE_ENV === 'development' && errorDetail && (
                <pre className="text-xs max-w-[90%] whitespace-pre-wrap break-words bg-gray-100 dark:bg-gray-800 p-2 rounded mb-2 max-h-48 overflow-auto">{JSON.stringify(errorDetail, null, 2)}</pre>
              )}
              {process.env.NODE_ENV === 'development' && health && (
                <div className="mb-2 text-xs opacity-80">Health: {health?.status} (team: {health?.team_slug})</div>
              )}
              {process.env.NODE_ENV === 'development' && (
                <div className="mb-3 text-xs text-center px-4 bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded border border-yellow-200 dark:border-yellow-800">
                  <strong>Local Development:</strong><br/>
                  Install Docker Desktop and run <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded font-mono">npm run dev:mm</code><br/>
                  <strong>OR</strong> use Railway Mattermost (already configured in .env.local)
                </div>
              )}
              <button 
                onClick={()=>{ 
                  if (retryCount < maxRetries) {
                    setReady(false); 
                    setError(null); 
                    setErrorDetail(null);
                    setSrc(''); 
                    setTab('team');
                    setRetryCount(prev => prev + 1);
                  }
                }} 
                disabled={retryCount >= maxRetries}
                className="px-3 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded transition-colors"
              >
                {retryCount >= maxRetries ? 'Max retries reached' : `Retry (${retryCount}/${maxRetries})`}
              </button>
            </>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              <div>Connecting to chat...</div>
              <div className="text-xs opacity-60 mt-2">This may take a few seconds</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
