"use client";
import { useEffect, useState } from 'react';

export default function AIAnalyticsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      // Prefer Prisma in server route; here use existing JSON usage API as a quick view
      const r = await fetch('/api/ai/usage?limit=200');
      const j = await r.json().catch(() => ({ ok: false }));
      if (j?.ok) setLogs(j.data);
      setLoading(false);
    };
    load();
  }, []);
  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold mb-4">AI Analytics</h1>
      {loading ? <div>Loading…</div> : (
        <div className="overflow-auto border rounded">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50"><tr>
              <th className="p-2 text-left">Time</th>
              <th className="p-2 text-left">User</th>
              <th className="p-2 text-left">Action/Mode</th>
              <th className="p-2 text-left">Authorized</th>
              <th className="p-2 text-left">Latency</th>
            </tr></thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.timestamp + (l.userId||'')} className="border-t">
                  <td className="p-2">{l.timestamp}</td>
                  <td className="p-2">{l.userId}</td>
                  <td className="p-2">{l.action || l.mode}</td>
                  <td className="p-2">{String(l.authorized ?? 'n/a')}</td>
                  <td className="p-2">{l.latencyMs ? `${l.latencyMs}ms` : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
