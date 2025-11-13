"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Filter, Shield, TimerReset, UserCheck } from 'lucide-react';

interface Event {
  id: string;
  occurred_at: string;
  source: string;
  event_type: string;
  severity: string;
  summary: string;
  details?: any;
  status: string;
  assignee_id?: number;
  tags: string[];
}

export default function SecurityMonitor() {
  const [events, setEvents] = useState<Event[]>([]);
  const [filters, setFilters] = useState({ start: '', end: '', severity: '', status: '' });
  const [metrics, setMetrics] = useState<{ openCount: number; resolvedCount: number; mtta: number | null; mttr: number | null } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const qs = new URLSearchParams(Object.entries(filters).filter(([_,v]) => v));
      const res = await fetch(`/api/v1/security/events?${qs.toString()}`, { credentials: 'include' });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message || 'Failed');
      setEvents(json.data || []);
      // Try backend metrics; fallback to client-side counts
      try {
        const mRes = await fetch(`/api/v1/security/metrics`, { credentials: 'include' });
        if (mRes.ok) {
          const mJson = await mRes.json();
          if (mJson.success) {
            setMetrics(mJson.data);
          } else {
            throw new Error('metrics failed');
          }
        } else {
          throw new Error('metrics http');
        }
      } catch {
        setMetrics({
          openCount: (json.data||[]).filter((e:Event)=>['open','investigating'].includes(e.status)).length,
          resolvedCount: (json.data||[]).filter((e:Event)=>['resolved','verified','closed'].includes(e.status)).length,
          mtta: null,
          mttr: null
        });
      }
    } catch (e:any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const severities = useMemo(() => ['','low','medium','high','critical'], []);
  const statuses = useMemo(() => ['','open','investigating','resolved','verified','closed'], []);

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-red-600" />
          <h3 className="text-lg font-medium">Security Monitor</h3>
        </div>
        <button onClick={load} className="inline-flex items-center px-3 py-1.5 text-sm bg-slate-100 rounded hover:bg-slate-200"><TimerReset className="w-4 h-4 mr-1"/>Refresh</button>
      </div>

      {/* Metrics */}
      {metrics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <div className="p-3 border rounded">
            <div className="text-xs text-slate-500">Open</div>
            <div className="text-2xl font-semibold text-red-600">{metrics.openCount}</div>
          </div>
          <div className="p-3 border rounded">
            <div className="text-xs text-slate-500">Resolved</div>
            <div className="text-2xl font-semibold text-emerald-600">{metrics.resolvedCount}</div>
          </div>
          <div className="p-3 border rounded">
            <div className="text-xs text-slate-500">MTTA</div>
            <div className="text-xl">{metrics.mtta ?? '-'}s</div>
          </div>
          <div className="p-3 border rounded">
            <div className="text-xs text-slate-500">MTTR</div>
            <div className="text-xl">{metrics.mttr ?? '-'}s</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-4">
        <input type="date" className="border rounded px-2 py-1" value={filters.start} onChange={e=>setFilters(f=>({...f,start:e.target.value}))} />
        <input type="date" className="border rounded px-2 py-1" value={filters.end} onChange={e=>setFilters(f=>({...f,end:e.target.value}))} />
        <select className="border rounded px-2 py-1" value={filters.severity} onChange={e=>setFilters(f=>({...f,severity:e.target.value}))}>
          {severities.map(s=> <option key={s} value={s}>{s||'All severities'}</option>)}
        </select>
        <select className="border rounded px-2 py-1" value={filters.status} onChange={e=>setFilters(f=>({...f,status:e.target.value}))}>
          {statuses.map(s=> <option key={s} value={s}>{s||'All statuses'}</option>)}
        </select>
        <button onClick={load} className="inline-flex items-center justify-center px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700"><Filter className="w-4 h-4 mr-1"/>Apply</button>
      </div>

      {error && <div className="p-3 mb-3 text-sm bg-red-50 text-red-700 border border-red-200 rounded">{error}</div>}

      {/* Events table */}
      <div className="overflow-auto border rounded">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="p-2 text-left">Time</th>
              <th className="p-2 text-left">Type</th>
              <th className="p-2 text-left">Severity</th>
              <th className="p-2 text-left">Summary</th>
              <th className="p-2 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {events.map(ev => (
              <tr key={ev.id} className="border-t">
                <td className="p-2 whitespace-nowrap">{new Date(ev.occurred_at).toLocaleString()}</td>
                <td className="p-2">{ev.event_type}</td>
                <td className="p-2 capitalize">{ev.severity}</td>
                <td className="p-2">{ev.summary}</td>
                <td className="p-2 capitalize">{ev.status}</td>
              </tr>
            ))}
            {!events.length && (
              <tr><td colSpan={5} className="p-4 text-center text-slate-500">No events</td></tr>
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
}
