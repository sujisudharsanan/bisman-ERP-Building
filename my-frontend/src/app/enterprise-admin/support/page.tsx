"use client";
import { useEffect, useState } from 'react';

export default function Page() {
  const [tickets,setTickets]=useState<any[]>([]);
  const [metrics,setMetrics]=useState<any>(null);
  const [loading,setLoading]=useState(true);
  const [err,setErr]=useState<string|null>(null);
  useEffect(()=>{(async()=>{
    try{ setLoading(true);
      const [t,m] = await Promise.all([
        fetch('/api/enterprise-admin/support/tickets?limit=20',{credentials:'include'}).then(r=>r.json()),
        fetch('/api/enterprise-admin/support/metrics',{credentials:'include'}).then(r=>r.json()),
      ]);
      setTickets(t.tickets||[]);
      setMetrics(m.metrics);
    }catch(e:any){ setErr(e.message||'Failed to load support'); }
    finally{ setLoading(false); }
  })();},[]);

  return (
    <div className="space-y-6 text-gray-900 dark:text-gray-100 p-6">
      <h1 className="text-2xl font-semibold">Support</h1>
      {err && <div className="p-3 rounded bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300">{err}</div>}
      {loading ? <div>Loading…</div> : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            <Stat label="Open" value={metrics?.overview?.openTickets} />
            <Stat label="New" value={metrics?.overview?.newTickets} />
            <Stat label="Pending" value={metrics?.overview?.pendingTickets} />
            <Stat label="Closed (week)" value={metrics?.overview?.closedThisWeek} />
          </div>
          <div className="bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th className="px-4 py-2 text-left">ID</th>
                  <th className="px-4 py-2 text-left">Subject</th>
                  <th className="px-4 py-2 text-left">Org</th>
                  <th className="px-4 py-2 text-left">Status</th>
                  <th className="px-4 py-2 text-left">Priority</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {tickets.map((t:any)=> (
                  <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                    <td className="px-4 py-2">{t.id}</td>
                    <td className="px-4 py-2">{t.subject}</td>
                    <td className="px-4 py-2">{t.organization}</td>
                    <td className="px-4 py-2">{t.status}</td>
                    <td className="px-4 py-2">{t.priority}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function Stat({label,value}:{label:string; value:any}){
  return (
    <div className="bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 p-4">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="text-xl font-semibold">{value ?? '-'}</div>
    </div>
  );
}
