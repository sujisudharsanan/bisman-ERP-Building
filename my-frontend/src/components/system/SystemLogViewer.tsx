'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  PlayCircle,
  PauseCircle,
  RefreshCw,
  Download,
  Clock,
  Calendar,
  Filter,
  AlertTriangle,
  Info,
  Bug,
  ChevronDown,
  ChevronRight,
  Copy,
  Check,
} from 'lucide-react';
import { Search } from '@/lib/ssr-safe-icons';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip as ReTooltip } from 'recharts';
import Input from '@/components/ui/Input';
import Badge from '@/components/ui/Badge';

type LogLevel = 'CRITICAL' | 'ERROR' | 'WARNING' | 'INFO' | 'DEBUG' | 'TRACE';

type LogEntry = {
  id: string;
  timestamp: number; // epoch ms
  level: LogLevel;
  source: string; // component/service
  host: string; // host/instance id
  pid: number; // process id
  thread?: string; // optional thread id/name
  message: string; // full raw text
  traceId?: string;
  context?: Record<string, any>; // structured payload
  stack?: string; // optional stack
};

type TimePreset = '5m' | '15m' | '1h' | '4h' | '24h' | 'custom';

type TimelinePoint = { t: string; count: number; error?: number; warn?: number; info?: number };

// Color mapping for levels
const LEVEL_COLOR: Record<LogLevel, string> = {
  CRITICAL: 'bg-red-600',
  ERROR: 'bg-orange-500',
  WARNING: 'bg-yellow-500',
  INFO: 'bg-blue-500',
  DEBUG: 'bg-gray-400',
  TRACE: 'bg-gray-300',
};

const LEVEL_BADGE_CLASS: Record<LogLevel, string> = {
  CRITICAL: 'bg-red-50 text-red-700 border-red-200',
  ERROR: 'bg-orange-50 text-orange-700 border-orange-200',
  WARNING: 'bg-yellow-50 text-yellow-800 border-yellow-300',
  INFO: 'bg-blue-50 text-blue-700 border-blue-200',
  DEBUG: 'bg-gray-50 text-gray-700 border-gray-200',
  TRACE: 'bg-gray-50 text-gray-500 border-gray-200',
};

const formatMs = (ms: number, useUTC: boolean) => {
  const d = new Date(ms);
  const pad = (n: number, w = 2) => String(n).padStart(w, '0');
  if (useUTC) {
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}.${String(d.getUTCMilliseconds()).padStart(3, '0')} UTC`;
  }
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${String(d.getMilliseconds()).padStart(3, '0')}`;
};

const jsonSafeStringify = (v: any) => {
  try { return JSON.stringify(v, null, 2); } catch { return String(v); }
};

// Very small structured query parser (supports: field:value, quoted strings, AND/OR/NOT, free text)
function buildPredicate(query: string): (e: LogEntry) => boolean {
  if (!query.trim()) return () => true;

  // Tokenize by quotes and spaces
  const tokens: string[] = [];
  let i = 0; let current = '';
  let inQuotes = false;
  while (i < query.length) {
    const c = query[i];
    if (c === '"') { inQuotes = !inQuotes; i++; continue; }
    if (!inQuotes && /\s/.test(c)) { if (current) tokens.push(current), current = ''; i++; continue; }
    current += c; i++;
  }
  if (current) tokens.push(current);

  type Node = { type: 'term'; key?: string; value: string; negate?: boolean } | { type: 'op'; op: 'AND'|'OR' };
  const terms: Node[] = [];
  let expectTerm = true;
  for (const t of tokens) {
    const upper = t.toUpperCase();
    if (!expectTerm && (upper === 'AND' || upper === 'OR')) {
      terms.push({ type: 'op', op: upper as 'AND'|'OR' });
      expectTerm = true; continue;
    }
    // term
    let negate = false;
    let raw = t;
    if (raw.startsWith('NOT:') || raw === 'NOT') { negate = true; raw = raw === 'NOT' ? '' : raw.slice(4); }
    let key: string | undefined;
    let value = raw;
    const idx = raw.indexOf(':');
    if (idx > -1) { key = raw.slice(0, idx); value = raw.slice(idx + 1); }
    terms.push({ type: 'term', key, value, negate });
    expectTerm = false;
  }

  const test = (e: LogEntry, n: Node): boolean => {
    if (n.type === 'op') return true;
    let ok = false;
    const v = n.value.toLowerCase();
    if (n.key) {
      const k = n.key.toLowerCase();
      const map: Record<string, string> = {
        timestamp: String(e.timestamp),
        level: e.level,
        severity: e.level,
        source: e.source,
        component: e.source,
        host: e.host,
        instance: e.host,
        pid: String(e.pid),
        thread: e.thread || '',
        message: e.message,
        trace: e.traceId || '',
      };
      const field = (map[k] ?? '').toLowerCase();
      ok = field.includes(v);
      // Also allow context.field=value
      if (!ok && k.startsWith('context.')) {
        const ck = k.slice(8);
        const cv = String((e.context ?? {})[ck] ?? '').toLowerCase();
        ok = cv.includes(v);
      }
    } else {
      ok = (
        e.level.toLowerCase().includes(v) ||
        e.source.toLowerCase().includes(v) ||
        e.host.toLowerCase().includes(v) ||
        e.message.toLowerCase().includes(v) ||
        (e.traceId || '').toLowerCase().includes(v)
      );
    }
    return n.negate ? !ok : ok;
  };

  return (e: LogEntry) => {
    // Default operator is AND
    let acc = true; let pendingOp: 'AND'|'OR' = 'AND';
    for (const n of terms) {
      if (n.type === 'op') { pendingOp = n.op; continue; }
      const res = test(e, n);
      acc = pendingOp === 'AND' ? (acc && res) : (acc || res);
    }
    return acc;
  };
}

// Mock generator for live tail and demo data
function useMockStream(enabled: boolean, push: (e: LogEntry) => void) {
  useEffect(() => {
    if (!enabled) return;
    const sources = ['WebServer-API', 'Database-Monitor', 'Auth-Service', 'Kernel', 'Cron-Job'];
    const hosts = ['web-1', 'web-2', 'db-1', 'auth-1', 'cron-1'];
    const levels: LogLevel[] = ['INFO', 'WARNING', 'ERROR', 'DEBUG', 'TRACE', 'CRITICAL'];
    const interval = setInterval(() => {
      const now = Date.now();
      const level = levels[Math.floor(Math.random() * levels.length)];
      const e: LogEntry = {
        id: `${now}-${Math.random().toString(36).slice(2, 8)}`,
        timestamp: now,
        level,
        source: sources[Math.floor(Math.random() * sources.length)],
        host: hosts[Math.floor(Math.random() * hosts.length)],
        pid: Math.floor(Math.random() * 5000) + 100,
        thread: Math.random() > 0.6 ? `thr-${Math.floor(Math.random() * 20)}` : undefined,
        message: level === 'ERROR' || level === 'CRITICAL' ? 'Operation failed for request id XYZ due to timeout' : 'Periodic heartbeat OK',
        traceId: Math.random() > 0.5 ? Math.random().toString(16).slice(2, 10) : undefined,
        context: { tenant: Math.random() > 0.5 ? 'acme' : 'globex', latencyMs: Math.floor(Math.random() * 250) + 20 },
        stack: Math.random() > 0.8 ? 'Error: Example\n    at handler (/app/src/index.ts:42:13)\n    at processTicksAndRejections (node:internal/process/task_queues:95:5)' : undefined,
      };
      push(e);
    }, 900);
    return () => clearInterval(interval);
  }, [enabled, push]);
}

function useCopyToClipboard() {
  const [copied, setCopied] = useState(false);
  const copy = useCallback(async (text: string) => {
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1200); } catch {}
  }, []);
  return { copied, copy };
}

export default function SystemLogViewer() {
  // State
  const [allLogs, setAllLogs] = useState<LogEntry[]>(() => {
    // seed with some history (last 15 min)
    const now = Date.now();
    const arr: LogEntry[] = [];
    for (let i = 0; i < 200; i++) {
      const t = now - Math.floor(Math.random() * 15 * 60 * 1000);
      arr.push({
        id: `${t}-${i}`,
        timestamp: t,
        level: i % 23 === 0 ? 'ERROR' : i % 37 === 0 ? 'CRITICAL' : i % 7 === 0 ? 'WARNING' : 'INFO',
        source: i % 5 === 0 ? 'Auth-Service' : i % 3 === 0 ? 'Database-Monitor' : 'WebServer-API',
        host: i % 4 === 0 ? 'web-1' : i % 4 === 1 ? 'web-2' : i % 4 === 2 ? 'db-1' : 'auth-1',
        pid: 100 + (i % 1000),
        thread: i % 6 === 0 ? `thr-${i % 20}` : undefined,
        message: i % 23 === 0 ? 'DB query timeout exceeded threshold' : 'Request processed successfully',
        traceId: i % 9 === 0 ? `trace-${(i % 100).toString(16)}` : undefined,
        context: { latencyMs: (i * 13) % 300, tenant: i % 2 === 0 ? 'acme' : 'globex' },
        stack: i % 37 === 0 ? 'Error: Timeout\n at dbCall (db.ts:12:4)\n at handler (api.ts:88:10)' : undefined,
      });
    }
    return arr.sort((a, b) => a.timestamp - b.timestamp);
  });
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [live, setLive] = useState(true);
  const [timePreset, setTimePreset] = useState<TimePreset>('15m');
  const [from, setFrom] = useState<number>(() => Date.now() - 15 * 60 * 1000);
  const [to, setTo] = useState<number>(() => Date.now());
  const [useUTC, setUseUTC] = useState(true);
  const [query, setQuery] = useState('');
  const [levels, setLevels] = useState<Record<LogLevel, boolean>>({ CRITICAL: true, ERROR: true, WARNING: true, INFO: true, DEBUG: false, TRACE: false });
  const [sourceFilter, setSourceFilter] = useState<string>('all');

  // Live tail mock
  const pushRef = useRef<(e: LogEntry) => void>();
  pushRef.current = (e: LogEntry) => setAllLogs(prev => [...prev, e]);
  useMockStream(live, (e) => pushRef.current?.(e));

  // Auto-scroll on live tail
  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!live) return;
    const el = listRef.current; if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [allLogs, live]);

  // Time range derived from preset
  useEffect(() => {
    if (timePreset === 'custom') return;
    const now = Date.now();
    const map: Record<Exclude<TimePreset, 'custom'>, number> = { '5m': 5, '15m': 15, '1h': 60, '4h': 240, '24h': 1440 };
    const mins = map[timePreset as Exclude<TimePreset, 'custom'>] || 15;
    setFrom(now - mins * 60 * 1000);
    setTo(now);
  }, [timePreset]);

  // Filtering
  const predicate = useMemo(() => buildPredicate(query), [query]);
  const sources = useMemo(() => {
    const set = new Set(allLogs.map(l => l.source));
    return ['all', ...Array.from(set).sort()];
  }, [allLogs]);

  const filtered = useMemo(() => {
    return allLogs.filter(e =>
      e.timestamp >= from && e.timestamp <= to &&
      levels[e.level] &&
      (sourceFilter === 'all' || e.source === sourceFilter) &&
      predicate(e)
    );
  }, [allLogs, from, to, levels, sourceFilter, predicate]);

  // Timeline aggregation by minute
  const timeline: TimelinePoint[] = useMemo(() => {
    const bucket = new Map<string, { count: number; error: number; warn: number; info: number }>();
    const fmt = (ms: number) => {
      const d = new Date(ms); const m = d.getMinutes();
      return `${d.getHours().toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    };
    for (const e of filtered) {
      const minuteMs = Math.floor(e.timestamp / 60000) * 60000;
      const key = fmt(minuteMs);
      const cur = bucket.get(key) || { count: 0, error: 0, warn: 0, info: 0 };
      cur.count += 1;
      if (e.level === 'ERROR' || e.level === 'CRITICAL') cur.error += 1;
      else if (e.level === 'WARNING') cur.warn += 1;
      else cur.info += 1;
      bucket.set(key, cur);
    }
    return Array.from(bucket.entries()).sort().map(([t, v]) => ({ t, count: v.count, error: v.error, warn: v.warn, info: v.info }));
  }, [filtered]);

  const onTimelineClick = (index: number) => {
    // When clicking a bar, narrow to that minute window
    const entry = timeline[index];
    if (!entry) return;
    // Find a sample log at that minute to compute ms range
    const found = filtered.find(e => {
      const d = new Date(e.timestamp); const key = `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
      return key === entry.t;
    });
    if (found) {
      const minuteStart = Math.floor(found.timestamp / 60000) * 60000;
      setTimePreset('custom');
      setFrom(minuteStart);
      setTo(minuteStart + 60000 - 1);
    }
  };

  // Export
  const exportData = (fmt: 'json' | 'csv' | 'txt') => {
    const rows = filtered;
    let blob: Blob;
    if (fmt === 'json') {
      blob = new Blob([JSON.stringify(rows, null, 2)], { type: 'application/json' });
    } else if (fmt === 'txt') {
      const lines = rows.map(r => `${formatMs(r.timestamp, useUTC)}\t${r.level}\t${r.source}\t${r.host}\t${r.pid}\t${r.message}`);
      blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    } else {
      const header = ['timestamp', 'level', 'source', 'host', 'pid', 'thread', 'traceId', 'message'];
      const lines = [header.join(',')];
      for (const r of rows) {
        const vals = [formatMs(r.timestamp, useUTC), r.level, r.source, r.host, String(r.pid), r.thread || '', r.traceId || '', JSON.stringify(r.message)];
        lines.push(vals.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));
      }
      blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `logs_${Date.now()}.${fmt}`; a.click();
    URL.revokeObjectURL(url);
  };

  const { copied, copy } = useCopyToClipboard();

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
      {/* Integrity banner */}
      <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 text-xs text-gray-700 dark:text-gray-300 flex items-center gap-2">
        <Info className="w-4 h-4" />
        <span>System Logs are immutable and retained for 30 days in compliance with audit controls. Editing is not permitted.</span>
      </div>

      {/* Toolbar */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-800">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-2">
            <button onClick={() => setLive(v => !v)} className={`px-3 py-2 rounded-md text-white flex items-center gap-2 ${live ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-600 hover:bg-gray-700'}`}>
              {live ? <PauseCircle className="w-4 h-4" /> : <PlayCircle className="w-4 h-4" />}
              <span>Live Tail</span>
            </button>
            <button onClick={() => { setTimePreset('5m'); setUseUTC(u => u); }} className="px-3 py-2 border rounded-md flex items-center gap-2"><RefreshCw className="w-4 h-4" /><span>Now</span></button>
            <div className="flex items-center gap-1 text-sm text-gray-700 dark:text-gray-300">
              <Calendar className="w-4 h-4" />
              <select value={timePreset} onChange={e => setTimePreset(e.target.value as TimePreset)} className="h-9 border rounded px-2 bg-white dark:bg-gray-900">
                <option value="5m">Last 5m</option>
                <option value="15m">Last 15m</option>
                <option value="1h">Last 1h</option>
                <option value="4h">Last 4h</option>
                <option value="24h">Last 24h</option>
                <option value="custom">Custom</option>
              </select>
              {timePreset === 'custom' && (
                <div className="flex items-center gap-2 ml-2">
                  <Clock className="w-4 h-4" />
                  <input type="datetime-local" className="h-9 border rounded px-2 bg-white dark:bg-gray-900" value={new Date(from).toISOString().slice(0,16)} onChange={e => setFrom(new Date(e.target.value).getTime())} />
                  <span>-</span>
                  <input type="datetime-local" className="h-9 border rounded px-2 bg-white dark:bg-gray-900" value={new Date(to).toISOString().slice(0,16)} onChange={e => setTo(new Date(e.target.value).getTime())} />
                </div>
              )}
            </div>
            <div className="ml-2 flex items-center gap-2 text-sm">
              <span className="text-gray-600 dark:text-gray-300">Time zone:</span>
              <button onClick={() => setUseUTC(v => !v)} className="px-2 py-1 border rounded hover:bg-gray-50 dark:hover:bg-gray-800">
                {useUTC ? 'UTC' : 'Local'}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative w-[380px] max-w-[50vw]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input placeholder='Query e.g. Severity:ERROR AND Source:"Auth-Service" AND NOT IP:"10.0.0.1"' value={query} onChange={(e: any) => setQuery(e.target.value)} className="pl-9" />
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => exportData('json')} className="px-3 py-2 border rounded-md flex items-center gap-2"><Download className="w-4 h-4" /> JSON</button>
              <button onClick={() => exportData('csv')} className="px-3 py-2 border rounded-md">CSV</button>
              <button onClick={() => exportData('txt')} className="px-3 py-2 border rounded-md">TXT</button>
            </div>
          </div>
        </div>

        {/* Quick filters */}
        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
          <span className="flex items-center gap-1 text-gray-700 dark:text-gray-300"><Filter className="w-4 h-4" /> Quick Filters:</span>
          {(['CRITICAL','ERROR','WARNING','INFO','DEBUG','TRACE'] as LogLevel[]).map(lvl => (
            <button key={lvl} onClick={() => setLevels(prev => ({ ...prev, [lvl]: !prev[lvl] }))} className={`px-2 py-1 rounded border ${levels[lvl] ? 'bg-gray-100 dark:bg-gray-800' : ''}`}>{lvl}</button>
          ))}
          <span className="ml-2 text-gray-700 dark:text-gray-300">Source:</span>
          <select value={sourceFilter} onChange={e => setSourceFilter(e.target.value)} className="h-8 border rounded px-2 bg-white dark:bg-gray-900">
            {sources.map(s => (<option key={s} value={s}>{s}</option>))}
          </select>
        </div>
      </div>

      {/* Mini timeline */}
      <div className="px-4 pt-3">
        <div className="h-24">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={timeline} onClick={(e: any) => { if (e && e.activeTooltipIndex != null) onTimelineClick(e.activeTooltipIndex); }}>
              <XAxis dataKey="t" tick={{ fontSize: 10 }} interval={Math.max(0, Math.floor(timeline.length / 8) - 1)} />
              <YAxis tick={{ fontSize: 10 }} width={28} allowDecimals={false} />
              <ReTooltip />
              <Bar dataKey="count" fill="#6b7280" radius={[3,3,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Table header */}
      <div className="mt-2 px-4 py-2 text-xs uppercase tracking-wide text-gray-500 border-y border-gray-200 dark:border-gray-800 grid grid-cols-12 gap-2">
        <div className="col-span-2">Timestamp</div>
        <div>Level</div>
        <div className="col-span-2">Source</div>
        <div>Host</div>
        <div>PID</div>
        <div className="col-span-5">Message</div>
      </div>

      {/* Table body */}
      <div ref={listRef} className="max-h-[52vh] overflow-auto divide-y divide-gray-100 dark:divide-gray-800">
        {filtered.length === 0 && (
          <div className="p-8 text-center text-gray-500 flex items-center justify-center gap-2"><AlertTriangle className="w-5 h-5" /> No logs match filters</div>
        )}
        {filtered.map((e) => {
          const isOpen = !!expanded[e.id];
          return (
            <div key={e.id} className="">
              <div className="px-4 py-2 grid grid-cols-12 gap-2 items-start hover:bg-gray-50 dark:hover:bg-gray-800">
                <div className="col-span-2 font-mono text-xs select-text" title={String(e.timestamp)}>
                  {formatMs(e.timestamp, useUTC)}
                </div>
                <div>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${LEVEL_BADGE_CLASS[e.level]}`}>
                    {e.level}
                  </span>
                </div>
                <div className="col-span-2 truncate" title={e.source}>{e.source}</div>
                <div className="truncate" title={e.host}>{e.host}</div>
                <div className="truncate" title={String(e.pid)}>{e.pid}</div>
                <div className="col-span-5">
                  <div className="flex items-start gap-2">
                    <button onClick={() => setExpanded(prev => ({ ...prev, [e.id]: !prev[e.id] }))} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700">
                      {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </button>
                    <div className="whitespace-pre-wrap break-words select-text">{e.message}</div>
                  </div>
                </div>
              </div>

              {/* Expanded raw/structured view */}
              {isOpen && (
                <div className="px-4 pb-3">
                  <div className="mx-6 mt-1 p-3 rounded border bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-gray-700 dark:text-gray-300">
                      <div><span className="text-gray-500">Trace:</span> {e.traceId ? (
                        <a href={`#/trace/${e.traceId}`} className="text-blue-600 hover:underline">{e.traceId}</a>
                      ) : <span className="text-gray-400">—</span>}</div>
                      <div><span className="text-gray-500">Thread:</span> {e.thread || <span className="text-gray-400">—</span>}</div>
                      <div><span className="text-gray-500">Component:</span> {e.source}</div>
                      <div><span className="text-gray-500">Instance:</span> {e.host}</div>
                    </div>

                    <div className="mt-2 text-xs">
                      <div className="flex items-center justify-between">
                        <div className="font-semibold text-gray-700 dark:text-gray-200">Raw Message</div>
                        <button onClick={() => copy(e.message)} className="text-xs inline-flex items-center gap-1 px-2 py-1 border rounded"><Copy className="w-3.5 h-3.5" /> Copy</button>
                      </div>
                      <pre className="mt-1 p-2 bg-white dark:bg-gray-900 rounded border overflow-auto max-h-32 text-[11px]">{e.message}</pre>
                    </div>

                    <div className="mt-3 text-xs">
                      <div className="flex items-center justify-between">
                        <div className="font-semibold text-gray-700 dark:text-gray-200">Structured Payload</div>
                        <button onClick={() => copy(jsonSafeStringify(e.context))} className="text-xs inline-flex items-center gap-1 px-2 py-1 border rounded"><Copy className="w-3.5 h-3.5" /> Copy</button>
                      </div>
                      <pre className="mt-1 p-2 bg-white dark:bg-gray-900 rounded border overflow-auto max-h-48 text-[11px]">{jsonSafeStringify(e.context)}</pre>
                    </div>

                    {e.stack && (
                      <div className="mt-3 text-xs">
                        <div className="flex items-center justify-between">
                          <div className="font-semibold text-gray-700 dark:text-gray-200 inline-flex items-center gap-1"><Bug className="w-4 h-4" /> Stack Trace</div>
                          <div className="flex items-center gap-2">
                            <button className="text-xs inline-flex items-center gap-1 px-2 py-1 border rounded">Acknowledge</button>
                            <button onClick={() => copy(e.stack!)} className="text-xs inline-flex items-center gap-1 px-2 py-1 border rounded"><Copy className="w-3.5 h-3.5" /> Copy</button>
                          </div>
                        </div>
                        <pre className="mt-1 p-2 bg-white dark:bg-gray-900 rounded border overflow-auto max-h-60 text-[11px]">{e.stack}</pre>
                      </div>
                    )}

                    {copied && (
                      <div className="mt-2 inline-flex items-center gap-1 text-green-600 text-xs"><Check className="w-4 h-4" /> Copied</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="border-t border-gray-200 dark:border-gray-800 px-4 py-2 text-xs text-gray-600 dark:text-gray-300 flex items-center justify-between">
        <div>Showing {filtered.length.toLocaleString()} of {allLogs.length.toLocaleString()} entries</div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1"><span className={`w-2 h-2 rounded-full ${LEVEL_COLOR.ERROR}`}></span> Error</span>
          <span className="inline-flex items-center gap-1"><span className={`w-2 h-2 rounded-full ${LEVEL_COLOR.WARNING}`}></span> Warn</span>
          <span className="inline-flex items-center gap-1"><span className={`w-2 h-2 rounded-full ${LEVEL_COLOR.INFO}`}></span> Info</span>
        </div>
      </div>
    </div>
  );
}
