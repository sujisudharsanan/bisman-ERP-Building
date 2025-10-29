"use client";
import { useEffect, useState } from 'react';

export default function Page() {
  const [tab,setTab]=useState<'rules'|'recipients'|'templates'|'history'>('rules');
  return (
    <div className="space-y-4 text-gray-900 dark:text-gray-100 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Notifications</h1>
        <div className="flex gap-2 text-sm">
          {['rules','recipients','templates','history'].map(t=> (
            <button key={t} onClick={()=>setTab(t as any)} className={`px-3 py-1.5 rounded border ${tab===t? 'bg-indigo-600 text-white border-indigo-600':'border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300'}`}>{t}</button>
          ))}
        </div>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 p-4">
        {tab==='rules' && <AsyncList url="/api/enterprise-admin/notifications/rules" path="rules" />}
        {tab==='recipients' && <AsyncBlock url="/api/enterprise-admin/notifications/recipients" selector={(d:any)=>d.recipients} />}
        {tab==='templates' && <AsyncList url="/api/enterprise-admin/notifications/templates" path="templates" />}
        {tab==='history' && <AsyncList url="/api/enterprise-admin/notifications/history" path="notifications" />}
      </div>
    </div>
  );
}

function AsyncList({url, path}:{url:string; path:string}){
  const [items,setItems]=useState<any[]>([]);
  const [loading,setLoading]=useState(true);
  const [err,setErr]=useState<string|null>(null);
  useEffect(()=>{(async()=>{
    try{ setLoading(true); const r= await fetch(url,{credentials:'include'}); const j= await r.json(); setItems(j[path]||[]);}catch(e:any){ setErr(e.message||'Failed'); }finally{ setLoading(false);} })();},[url,path]);
  if (loading) return <div className="text-sm text-gray-500">Loading…</div>;
  if (err) return <div className="text-sm text-red-600">{err}</div>;
  return (
    <ul className="divide-y divide-gray-200 dark:divide-gray-700 text-sm">
      {items.map((it:any,idx:number)=> (
        <li key={it.id||idx} className="py-2">
          <pre className="text-xs overflow-x-auto">{JSON.stringify(it,null,2)}</pre>
        </li>
      ))}
    </ul>
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
