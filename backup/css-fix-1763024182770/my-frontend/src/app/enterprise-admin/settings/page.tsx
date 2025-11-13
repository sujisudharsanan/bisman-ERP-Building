"use client";

import React, { useEffect, useState } from "react";

type General = {
  systemName: string;
  defaultTimezone: string;
  defaultLanguage: string;
  sessionTimeout: number;
  dateFormat: string;
  timeFormat: string;
  currency: string;
};

type Security = {
  passwordPolicy: { minLength: number };
  mfaSettings: { required: boolean };
};

export default function EnterpriseAdminSettings() {
  const [tab, setTab] = useState<'general'|'security'|'usage'|'maintenance'|'localization'|'overview'>('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string|null>(null);
  const [general, setGeneral] = useState<General | null>(null);
  const [security, setSecurity] = useState<Security | null>(null);
  const [overview, setOverview] = useState<any>(null);

  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        const [g, s, o] = await Promise.all([
          fetch('/api/enterprise-admin/settings/general', { credentials: 'include' }).then(r=>r.json()),
          fetch('/api/enterprise-admin/settings/security', { credentials: 'include' }).then(r=>r.json()),
          fetch('/api/enterprise-admin/settings/overview', { credentials: 'include' }).then(r=>r.json()),
        ]);
        setGeneral(g.settings);
        setSecurity(s.settings);
        setOverview(o.overview);
      } catch (e:any) {
        setError(e.message || 'Failed to load settings');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Settings</h1>
        <div className="flex gap-2 text-sm">
          {['overview','general','security','usage','maintenance','localization'].map((t)=> (
            <button key={t} onClick={()=>setTab(t as any)} className={`px-3 py-1.5 rounded border ${tab===t? 'bg-indigo-600 text-white border-indigo-600':'border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300'}`}>{t}</button>
          ))}
        </div>
      </div>
      {error && <div className="p-3 rounded bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300">{error}</div>}
      {loading ? (
        <div className="text-gray-600 dark:text-gray-300">Loading…</div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 p-4">
          {tab==='overview' && (
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-gray-500">Environment</div>
                <div className="font-medium">{overview?.general?.environment}</div>
              </div>
              <div>
                <div className="text-gray-500">Version</div>
                <div className="font-medium">{overview?.general?.version}</div>
              </div>
            </div>
          )}
          {tab==='general' && general && (
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-gray-500">System Name</div>
                <div className="font-medium">{general.systemName}</div>
              </div>
              <div>
                <div className="text-gray-500">Timezone</div>
                <div className="font-medium">{general.defaultTimezone}</div>
              </div>
            </div>
          )}
          {tab==='security' && security && (
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-gray-500">Password min length</div>
                <div className="font-medium">{security.passwordPolicy.minLength}</div>
              </div>
              <div>
                <div className="text-gray-500">MFA Required</div>
                <div className="font-medium">{security.mfaSettings.required? 'Yes':'No'}</div>
              </div>
            </div>
          )}
          {tab==='usage' && (
            <AsyncBlock url="/api/enterprise-admin/settings/usage" selector={(d:any)=>d.settings} />
          )}
          {tab==='maintenance' && (
            <AsyncBlock url="/api/enterprise-admin/settings/maintenance" selector={(d:any)=>d.maintenance} />
          )}
          {tab==='localization' && (
            <AsyncBlock url="/api/enterprise-admin/settings/localization" selector={(d:any)=>d.settings} />
          )}
        </div>
      )}
    </div>
  );
}

function AsyncBlock({ url, selector }:{ url:string; selector:(d:any)=>any }){
  const [data,setData] = useState<any>(null);
  const [err,setErr] = useState<string|null>(null);
  const [loading,setLoading] = useState(true);
  useEffect(()=>{(async()=>{
    try{ setLoading(true); const r= await fetch(url,{credentials:'include'}); const j= await r.json(); setData(selector(j)); }
    catch(e:any){ setErr(e.message||'Failed'); }
    finally{ setLoading(false); }
  })();},[url]);
  if (loading) return <div className="text-sm text-gray-500">Loading…</div>;
  if (err) return <div className="text-sm text-red-600">{err}</div>;
  return <pre className="text-xs overflow-x-auto">{JSON.stringify(data,null,2)}</pre>;
}
