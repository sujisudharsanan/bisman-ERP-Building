'use client';

import React, { useEffect, useState } from 'react';
import { api, User } from '../utils/api';

interface Props { roleId?: string; roleName?: string; value: User | null; onChange: (u: User|null) => void }

export default function UserSearch({ roleId, roleName, value, onChange }: Props) {
  const [q, setQ] = useState('');
  const [list, setList] = useState<User[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!roleId) { setList([]); return; }
    let active = true;
  api.searchUsersByRole(roleId, q, roleName).then(r => { if (active) setList(r); });
    return () => { active = false; };
  }, [q, roleId]);

  const disabled = !roleId;

  return (
    <div className="relative w-full">
      <input
        className={`w-full px-3 py-2 rounded-md border text-sm ${disabled ? 'cursor-not-allowed opacity-60' : ''} border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500`}
        placeholder="Search User"
        value={value ? (value.name || value.email || value.id) : q}
        onChange={e => { setQ(e.target.value); onChange(null); setOpen(true); }}
        onFocus={() => !disabled && setOpen(true)}
        disabled={disabled}
      />
      {open && !disabled && (
        <div className="absolute z-20 mt-1 w-full max-h-56 overflow-auto bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-md shadow">
          {list.length === 0 && (
            <div className="p-2 text-xs text-gray-500 dark:text-gray-400">No users</div>
          )}
          {list.map(u => (
            <button
              key={u.id}
              onClick={() => { onChange(u); setQ(''); setOpen(false); }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-800 dark:text-gray-100"
            >
              {u.name || u.email || u.id}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
