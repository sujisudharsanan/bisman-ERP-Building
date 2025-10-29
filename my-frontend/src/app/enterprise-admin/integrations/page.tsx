"use client";
import { useEffect, useState } from 'react';

export default function Page() {
  const [integrations,setIntegrations]=useState<any[]>([]);
  const [sso,setSso]=useState<any>(null);
  const [apiKeys,setApiKeys]=useState<any[]>([]);
  const [webhooks,setWebhooks]=useState<any[]>([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState<string|null>(null);

  useEffect(()=>{(async()=>{
    try{
      setLoading(true);
      const [i,s,k,w] = await Promise.all([
        fetch('/api/enterprise-admin/integrations',{credentials:'include'}).then(r=>r.json()),
        fetch('/api/enterprise-admin/integrations/sso',{credentials:'include'}).then(r=>r.json()),
        fetch('/api/enterprise-admin/integrations/api-keys',{credentials:'include'}).then(r=>r.json()),
        fetch('/api/enterprise-admin/integrations/webhooks',{credentials:'include'}).then(r=>r.json()),
      ]);
      setIntegrations(i.integrations||[]);
      setSso(s.ssoConfig);
      setApiKeys(k.apiKeys||[]);
      setWebhooks(w.webhooks||[]);
    }catch(e:any){ setError(e.message||'Failed to load integrations'); }
    finally{ setLoading(false); }
  })();},[]);

  return (
    <div className="space-y-6 text-gray-900 dark:text-gray-100 p-6">
      <h1 className="text-2xl font-semibold">Integrations</h1>
      {error && <div className="p-3 rounded bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300">{error}</div>}
      {loading ? (
        <div>Loading…</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card title="Connected Integrations">
            <ul className="divide-y divide-gray-200 dark:divide-gray-700 text-sm">
              {integrations.map((it:any)=> (
                <li key={it.id} className="py-3 flex items-center justify-between">
                  <div>
                    <div className="font-medium">{it.name}</div>
                    <div className="text-gray-500 text-xs">{it.description}</div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded ${it.status==='configured'?'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300':'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300'}`}>{it.status}</span>
                </li>
              ))}
            </ul>
          </Card>
          <Card title="SSO / SAML">
            <pre className="text-xs overflow-x-auto">{JSON.stringify(sso,null,2)}</pre>
          </Card>
          <Card title="API Keys">
            <ul className="divide-y divide-gray-200 dark:divide-gray-700 text-sm">
              {apiKeys.map((k:any)=> (
                <li key={k.id} className="py-3 flex items-center justify-between">
                  <div>
                    <div className="font-medium">{k.name}</div>
                    <div className="text-gray-500 text-xs">{k.keyId}</div>
                  </div>
                  <span className="text-xs">{k.status}</span>
                </li>
              ))}
            </ul>
          </Card>
          <Card title="Webhooks">
            <ul className="divide-y divide-gray-200 dark:divide-gray-700 text-sm">
              {webhooks.map((w:any)=> (
                <li key={w.id} className="py-3">
                  <div className="font-medium">{w.name}</div>
                  <div className="text-gray-500 text-xs">{w.targetUrl}</div>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      )}
    </div>
  );
}

function Card({title, children}:{title:string; children:React.ReactNode}){
  return (
    <div className="bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 p-4">
      <div className="font-semibold mb-3">{title}</div>
      {children}
    </div>
  );
}
