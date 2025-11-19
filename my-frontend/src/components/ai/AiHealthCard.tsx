'use client';

import React, { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';

type Health = {
  ok: boolean;
  base?: string;
  models?: any;
  error?: string;
  detail?: string;
};

export default function AiHealthCard() {
  const [data, setData] = useState<Health | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/ai/health', { cache: 'no-store' });
      const j = await res.json();
      setData(j);
    } catch (e: any) {
      setData({ ok: false, error: 'fetch_failed', detail: e?.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ok = data?.ok;
  const models = Array.isArray(data?.models)
    ? data?.models
    : (data?.models?.models || data?.models?.data || []);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">AI Health</h3>
        <button onClick={load} className="inline-flex items-center px-3 py-1.5 text-sm rounded-md bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600">
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>
      <div className="flex items-center gap-2 mb-2">
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${ok ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'}`}>
          {ok ? 'Connected' : 'Unavailable'}
        </span>
        {data?.base && (
          <span className="text-xs text-gray-500 dark:text-gray-400 truncate">{data.base}</span>
        )}
      </div>
      {!ok && (
        <div className="text-sm text-red-600 dark:text-red-400">
          {data?.error || 'Unknown error'}
          {data?.detail ? ` — ${String(data.detail).slice(0, 160)}` : ''}
        </div>
      )}
      {ok && (
        <div className="text-sm text-gray-700 dark:text-gray-200">
          <div className="mb-1">Models:</div>
          <ul className="list-disc ml-5">
            {models?.slice?.(0, 5)?.map?.((m: any, i: number) => (
              <li key={i} className="text-xs">
                {m?.name || m?.model || m?.tag || JSON.stringify(m)}
              </li>
            )) || <li className="text-xs">No models reported</li>}
          </ul>
        </div>
      )}
    </div>
  );
}
