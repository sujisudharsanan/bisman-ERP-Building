'use client';

import React, { useEffect, useState } from 'react';
import { api, Role } from '../utils/api';

interface Props { value: Role | null; onChange: (r: Role|null) => void }

export default function RoleSearch({ value, onChange }: Props) {
  const [q, setQ] = useState('');
  const [list, setList] = useState<Role[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let active = true;
    api.searchRoles(q).then(r => { if (active) setList(r); });
    return () => { active = false; };
  }, [q]);

  return (
    <div className="relative w-full">
      <input
        className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        placeholder="Search Role"
        value={value ? value.name : q}
        onChange={e => { setQ(e.target.value); onChange(null); setOpen(true); }}
        onFocus={() => setOpen(true)}
      />
      {open && (
        <div className="absolute z-20 mt-1 w-full max-h-56 overflow-auto bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-md shadow">
          {list.length === 0 && (
            <div className="p-2 text-xs text-gray-500 dark:text-gray-400">No roles</div>
          )}
          {list.map(r => (
            <button
              key={r.id}
              onClick={() => { onChange(r); setQ(''); setOpen(false); }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-800 dark:text-gray-100 flex items-center justify-between gap-2"
            >
              <span>{r.name}</span>
              {typeof r.userCount === 'number' && (
                <span className="text-xs rounded bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 px-2 py-0.5">{r.userCount}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
