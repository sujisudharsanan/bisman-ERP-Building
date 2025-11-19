"use client";
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export default function SuperAdminAIHandlingPage() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<any[]>([]);
  useEffect(() => {
    const load = async () => {
      const r = await fetch('/api/ai/usage?limit=50');
      const j = await r.json().catch(() => ({ ok: false }));
      if (j?.ok) setLogs(j.data);
    };
    load();
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold mb-4">AI Models & Performance</h1>
      <div className="text-sm text-gray-600 dark:text-gray-300 mb-4">Role: {user?.roleName || user?.role}</div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <Metric title="Requests (recent)" value={String(logs.length)} />
        <Metric title="Avg. Latency" value={avg(logs.map((l:any)=>l.latencyMs)).toFixed(0) + ' ms'} />
        <Metric title="Authorized %" value={percent(logs)} />
        <Metric title="Modes Seen" value={new Set(logs.map((l:any)=>l.mode).filter(Boolean)).size} />
      </div>

      <div className="border rounded overflow-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50"><tr>
            <th className="p-2 text-left">Time</th>
            <th className="p-2 text-left">Prompt</th>
            <th className="p-2 text-left">Mode</th>
            <th className="p-2 text-left">Latency</th>
            <th className="p-2 text-left">Authorized</th>
          </tr></thead>
          <tbody>
            {logs.map((l:any) => (
              <tr key={l.timestamp + (l.userId||'')} className="border-t">
                <td className="p-2 whitespace-nowrap">{l.timestamp}</td>
                <td className="p-2 max-w-[320px] truncate" title={l.prompt}>{l.prompt}</td>
                <td className="p-2">{l.mode || l.action}</td>
                <td className="p-2">{l.latencyMs? `${l.latencyMs}ms`: ''}</td>
                <td className="p-2">{String(l.authorized ?? 'n/a')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function avg(nums: number[]) { const a = nums.filter((n)=>Number.isFinite(n)); return a.length? (a.reduce((s,n)=>s+n,0)/a.length) : 0; }
function percent(list: any[]) { const a = list.filter((l)=>l.authorized===true).length; return list.length? Math.round((a*100)/list.length)+'%' : '0%'; }

function Metric({ title, value }: { title: string; value: string | number }) {
  return (
    <div className="rounded-lg border bg-white dark:bg-slate-900 dark:border-gray-700 p-4">
      <div className="text-xs text-gray-500 mb-1">{title}</div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}
