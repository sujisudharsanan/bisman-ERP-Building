"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, ChevronDown, ChevronRight, Filter, Info, Search, ShieldAlert, User } from 'lucide-react';
import { formatAbsolute, formatRelative } from '@/lib/time';

type Log = {
  id: string;
  timestamp: string;
  action: string;
  target?: string | null;
  actorId?: string | null;
  actor?: { id: string; name?: string | null; email?: string | null };
  severity?: 'info' | 'warn' | 'error' | 'success';
  meta?: any;
};

const severityIcon = (s?: string) => {
  switch (s) {
    case 'success':
      return <CheckCircle2 className="w-4 h-4 text-green-600" />;
    case 'warn':
      return <ShieldAlert className="w-4 h-4 text-amber-600" />;
    case 'error':
      return <AlertCircle className="w-4 h-4 text-red-600" />;
    default:
      return <Info className="w-4 h-4 text-slate-600" />;
  }
};

export default function ActivityLogsPage() {
  const [q, setQ] = useState('');
  const [severity, setSeverity] = useState<string>('');
  const [actorId, setActorId] = useState('');
  const [range, setRange] = useState<{ from?: string; to?: string }>({});
  const [logs, setLogs] = useState<Log[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const grouped = useMemo(() => {
    const map: Record<string, Log[]> = {};
    for (const l of logs) {
      const d = new Date(l.timestamp);
      const key = d.toDateString();
      if (!map[key]) map[key] = [];
      map[key].push(l);
    }
    return Object.entries(map);
  }, [logs]);

  const fetchLogs = async (append = false) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q) params.set('q', q);
      if (severity) params.set('severity', severity);
      if (actorId) params.set('actorId', actorId);
      if (range.from) params.set('from', range.from);
      if (range.to) params.set('to', range.to);
      if (append && cursor) params.set('cursor', cursor);
      const r = await fetch(`/api/activity-logs?${params.toString()}`);
      const j = await r.json();
      if (j.ok) {
        setLogs((prev) => (append ? [...prev, ...j.data] : j.data));
        setCursor(j.nextCursor || null);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="p-6 grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Filters */}
      <aside className="lg:col-span-1 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 h-fit">
        <div className="flex items-center gap-2 font-semibold mb-3"><Filter className="w-4 h-4"/> Filters</div>
        <div className="space-y-3 text-sm">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-2 top-2.5 text-slate-400"/>
            <input value={q} onChange={(e)=>setQ(e.target.value)} placeholder="Search keywords" className="w-full pl-7 pr-2 py-2 rounded border border-slate-300 dark:border-slate-600 bg-transparent"/>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Severity</label>
            <select value={severity} onChange={(e)=>setSeverity(e.target.value)} className="w-full border rounded px-2 py-2 bg-transparent">
              <option value="">All</option>
              <option value="info">Info</option>
              <option value="success">Success</option>
              <option value="warn">Warning</option>
              <option value="error">Error</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Actor ID</label>
            <input value={actorId} onChange={(e)=>setActorId(e.target.value)} placeholder="User ID or system" className="w-full border rounded px-2 py-2 bg-transparent"/>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-slate-500 mb-1">From</label>
              <input type="date" value={range.from || ''} onChange={(e)=>setRange(r=>({...r, from: e.target.value}))} className="w-full border rounded px-2 py-2 bg-transparent"/>
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">To</label>
              <input type="date" value={range.to || ''} onChange={(e)=>setRange(r=>({...r, to: e.target.value}))} className="w-full border rounded px-2 py-2 bg-transparent"/>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={()=>{setCursor(null); fetchLogs(false);}} className="px-3 py-2 rounded bg-indigo-600 text-white text-sm">Apply</button>
            <button onClick={()=>{setQ('');setSeverity('');setActorId('');setRange({}); setCursor(null); fetchLogs(false);}} className="px-3 py-2 rounded border text-sm">Reset</button>
          </div>
        </div>
      </aside>

      {/* List */}
      <section className="lg:col-span-3 space-y-6">
        {grouped.length === 0 ? (
          <div className="text-center text-slate-500">No activity yet.</div>
        ) : grouped.map(([day, items]) => (
          <div key={day}>
            <div className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-900 py-1 px-2 rounded text-xs text-slate-500 border">{day}</div>
            <ul className="mt-2 divide-y divide-slate-200 dark:divide-slate-700">
              {items.map((l) => (
                <li key={l.id} className="p-3 hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                  <div className="flex items-start gap-3">
                    <div className="mt-1">{severityIcon(l.severity)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="truncate text-sm">
                          <span className="font-medium">{l.action}</span>
                          {l.target ? <span className="text-slate-500"> on {l.target}</span> : null}
                          {l.actor ? (
                            <span className="ml-2 inline-flex items-center gap-1 text-slate-500"><User className="w-3 h-3"/> {l.actor.name || l.actor.email || l.actor.id}</span>
                          ) : null}
                        </div>
                        <div className="text-xs text-slate-500" title={formatAbsolute(l.timestamp)}>{formatRelative(l.timestamp)}</div>
                      </div>
                      {l.meta ? (
                        <button onClick={()=>setExpanded(e=>({...e, [l.id]: !e[l.id]}))} className="mt-1 inline-flex items-center gap-1 text-xs text-indigo-600">
                          {expanded[l.id] ? <ChevronDown className="w-3 h-3"/> : <ChevronRight className="w-3 h-3"/>}
                          Details
                        </button>
                      ) : null}
                      {expanded[l.id] ? (
                        <pre className="mt-2 text-xs bg-slate-100 dark:bg-slate-800 p-2 rounded overflow-auto max-h-64">{JSON.stringify(l.meta, null, 2)}</pre>
                      ) : null}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}
        {cursor ? (
          <div className="flex justify-center">
            <button disabled={loading} onClick={()=>fetchLogs(true)} className="px-4 py-2 rounded border text-sm disabled:opacity-60">
              {loading ? 'Loading...' : 'Load more'}
            </button>
          </div>
        ) : null}
      </section>
    </div>
  );
}
