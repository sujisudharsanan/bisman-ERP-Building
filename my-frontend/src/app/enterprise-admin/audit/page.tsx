"use client";
import { useEffect, useState } from 'react';

export default function Page() {
  const [logs,setLogs]=useState<any[]>([]);
  const [summary,setSummary]=useState<any>(null);
  const [loading,setLoading]=useState(true);
  const [err,setErr]=useState<string|null>(null);
  useEffect(()=>{(async()=>{
    try{ setLoading(true);
      const [l,s] = await Promise.all([
        fetch('/api/enterprise-admin/audit?limit=20',{credentials:'include'}).then(r=>r.json()),
        fetch('/api/enterprise-admin/audit/summary',{credentials:'include'}).then(r=>r.json()),
      ]);
      setLogs(l.logs||[]);
      setSummary(s.summary);
    }catch(e:any){ setErr(e.message||'Failed to load audit'); }
    finally{ setLoading(false); }
  })();},[]);
  return (
    <div className="space-y-6 text-gray-900 dark:text-gray-100 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Audit & Security</h1>
        <a href="/api/enterprise-admin/audit/export" className="px-3 py-1.5 rounded bg-indigo-600 text-white text-sm">Export CSV</a>
      </div>
      {err && <div className="p-3 rounded bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300">{err}</div>}
      {loading ? <div>Loading…</div> : (
        <>
          <div className="bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 p-4">
            <div className="font-semibold mb-2">Top Actions</div>
            <pre className="text-xs overflow-x-auto">{JSON.stringify(summary?.actionStats,null,2)}</pre>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th className="px-4 py-2 text-left">Time</th>
                  <th className="px-4 py-2 text-left">Action</th>
                  <th className="px-4 py-2 text-left">Entity</th>
                  <th className="px-4 py-2 text-left">User</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {logs.map((log:any)=> (
                  <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                    <td className="px-4 py-2">{new Date(log.createdAt).toLocaleString()}</td>
                    <td className="px-4 py-2">{log.action}</td>
                    <td className="px-4 py-2">{log.entity}#{log.entityId}</td>
                    <td className="px-4 py-2">{log.username}</td>
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
