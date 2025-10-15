"use client";

import React from 'react';
import { RefreshCw, Download } from 'lucide-react';

type PageEntry = {
  name: string;
  filePath: string;
  urlPath: string;
  connected: string[];
  status: 'connected' | 'partial' | 'missing';
  accessRoles?: string[];
  notes?: string[];
};

export default function PageDirectory() {
  const [pages, setPages] = React.useState<PageEntry[]>([]);
  const [query, setQuery] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  const fetchPages = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/settings/pages');
      const json = await res.json();
      setPages(json.pages || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { fetchPages(); }, [fetchPages]);

  // Live updates: prefer SSE, fallback to polling
  React.useEffect(() => {
  let es: EventSource | null = null;
  let pollId: ReturnType<typeof setInterval> | null = null;

    if (typeof window !== 'undefined' && 'EventSource' in window) {
      try {
        es = new EventSource('/api/settings/pages/stream');
        es.addEventListener('change', (ev: any) => {
          // trigger full refresh when a change event arrives
          fetchPages();
        });
        es.addEventListener('ping', () => { /* keepalive */ });
        es.onerror = () => {
          try { es?.close(); } catch {};
          es = null;
          // start polling fallback
          pollId = setInterval(() => fetchPages(), 10000);
        };
      } catch (e) {
  // fallback to polling
  pollId = setInterval(() => fetchPages(), 10000);
      }
    } else {
  pollId = setInterval(() => fetchPages(), 10000);
    }

    return () => {
  try { es?.close(); } catch {}
  if (pollId) clearInterval(pollId);
    };
    // intentionally not including fetchPages in deps to avoid re-registering
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = pages.filter(p => p.name.toLowerCase().includes(query.toLowerCase()) || p.urlPath.toLowerCase().includes(query.toLowerCase()));

  const [activeNotes, setActiveNotes] = React.useState<string[] | null>(null);

  const exportCsv = () => {
    const rows = [['Page Name','URL Path','Connected Elements','Status'], ...pages.map(p => [p.name, p.urlPath, p.connected.join(';'), p.status])];
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'page-directory.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4">
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1">
          <input aria-label="Search pages" className="w-full rounded-md border border-theme px-3 py-2 bg-transparent" placeholder="Search pages or paths..." value={query} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)} />
        </div>
        <button onClick={fetchPages} className="inline-flex items-center gap-2 rounded-md px-3 py-2 border border-theme bg-panel/70"><RefreshCw /> Refresh</button>
        <button onClick={exportCsv} className="inline-flex items-center gap-2 rounded-md px-3 py-2 border border-theme bg-panel/70"><Download /> Export</button>
      </div>

      <div className="overflow-auto rounded-lg border border-theme bg-panel/60 p-2">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-muted">
              <th className="px-3 py-2">Page Name</th>
              <th className="px-3 py-2">URL Path</th>
              <th className="px-3 py-2">Connected Elements</th>
              <th className="px-3 py-2">Access</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(p => (
              <tr key={p.filePath} className={`${p.status === 'missing' ? 'bg-red-50 dark:bg-red-900/30' : ''}`}>
                <td className="px-3 py-2 font-medium">{p.name}</td>
                <td className="px-3 py-2 font-mono text-xs text-muted">{p.urlPath}</td>
                <td className="px-3 py-2">{p.connected.length ? p.connected.join(', ') : '-'}</td>
                <td className="px-3 py-2">
                  {p.accessRoles && p.accessRoles.length ? (
                    <div className="flex gap-2 items-center flex-wrap">
                      {p.accessRoles.map(r => (
                        <span key={r} className="px-2 py-0.5 rounded-md bg-panel/50 text-xs">{r}</span>
                      ))}
                    </div>
                  ) : <span className="text-muted">Anyone</span>}
                </td>
                <td className="px-3 py-2">
                  {p.status === 'connected' && <span className="inline-block px-2 py-1 rounded-md bg-green-600 text-white text-xs">Connected</span>}
                  {p.status === 'partial' && <span className="inline-block px-2 py-1 rounded-md bg-yellow-600 text-white text-xs">Partial</span>}
                  {p.status === 'missing' && <span className="inline-block px-2 py-1 rounded-md bg-red-600 text-white text-xs">Not Linked</span>}
                  {p.notes && p.notes.length > 0 && (
                    <button onClick={() => setActiveNotes(p.notes || [])} className="ml-2 text-sm text-muted">Info</button>
                  )}
                </td>
                <td className="px-3 py-2 text-right">
                  {p.status !== 'missing' ? (
                    <a href={p.urlPath || '/'} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-md px-3 py-1 border border-theme bg-emerald-600 text-white text-sm">Go</a>
                  ) : (
                    <button disabled className="inline-flex items-center gap-2 rounded-md px-3 py-1 border border-theme bg-gray-200 text-gray-500 text-sm" title="Page not linked">Go</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {activeNotes && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setActiveNotes(null)}>
          <div className="bg-white dark:bg-gray-900 rounded-lg p-4 max-w-xl w-full" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-2">Notes</h3>
            <ul className="list-disc ml-5 space-y-1 text-sm text-muted">
              {activeNotes.map((n, i) => <li key={i}>{n}</li>)}
            </ul>
            <div className="mt-4 text-right">
              <button className="px-3 py-1 rounded-md border" onClick={() => setActiveNotes(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
