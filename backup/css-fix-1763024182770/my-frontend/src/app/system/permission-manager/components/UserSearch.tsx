
'use client';

import React, { useEffect, useState } from 'react';
import { api, User } from '../utils/api';

interface Props { 
  roleId?: string; 
  roleName?: string; 
  value: User | null; 
  onChange: (u: User|null) => void;
  disabled?: boolean;
}

export default function UserSearch({ roleId, roleName, value, onChange, disabled: propDisabled }: Props) {
  const [q, setQ] = useState('');
  const [list, setList] = useState<User[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    console.log('[UserSearch] roleId:', roleId, 'roleName:', roleName);
    if (roleId == null) { 
      console.log('[UserSearch] roleId is null/undefined, skipping fetch');
      setList([]); 
      return; 
    }
    let active = true;
    console.log('[UserSearch] Fetching users for role:', roleId, roleName);
    api.searchUsersByRole(roleId, q, roleName)
      .then(r => { 
        if (active) {
          console.log('[UserSearch] Received users:', r.length);
          setList(r);
        }
      })
      .catch(err => {
        console.error('[UserSearch] Error fetching users:', err);
        if (active) setList([]);
      });
    return () => { active = false; };
  }, [q, roleId, roleName]);

  const disabled = propDisabled || roleId == null;

  return (
    <div className="relative w-full">
      <input
        className={`w-full px-3 py-2 rounded-md border text-sm ${disabled ? 'cursor-not-allowed opacity-60 bg-gray-100 dark:bg-slate-900/50' : 'bg-white dark:bg-slate-800'} border-gray-300 dark:border-slate-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500`}
        placeholder={disabled ? "Select a role first" : "Search User"}
        value={value ? (value.name || value.email || value.id) : q}
        onChange={e => { setQ(e.target.value); onChange(null); setOpen(true); }}
        onFocus={() => !disabled && setOpen(true)}
        disabled={disabled}
        title={disabled && !roleId ? "Please select a role first" : ""}
      />
      {open && !disabled && (
        <div className="absolute z-20 mt-1 w-full max-h-56 overflow-auto bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-md shadow-lg">
          {list.length === 0 && (
            <div className="p-3 text-xs text-gray-500 dark:text-gray-400 text-center">
              {q ? 'No matching users found' : 'No users in this role'}
            </div>
          )}
          {list.map(u => (
            <button
              key={u.id}
              onClick={() => { onChange(u); setQ(''); setOpen(false); }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-800 dark:text-gray-100 border-b border-gray-100 dark:border-slate-800 last:border-0"
            >
              <div className="font-medium">{u.name}</div>
              {u.email && <div className="text-xs text-gray-500 dark:text-gray-400">{u.email}</div>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
