"use client";
import { useEffect, useState } from 'react';

type Role = { id: string; key: string; name: string };
type Allowed = { id: string; roleId: string; moduleKey: string };

export default function RBACAllowedModules() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [selected, setSelected] = useState<Role | null>(null);
  const [allowed, setAllowed] = useState<Allowed[]>([]);
  const [newModule, setNewModule] = useState('');

  useEffect(() => { (async ()=>{
    const r = await fetch('/api/admin/roles');
    const j = await r.json();
    if (j?.ok) setRoles(j.data);
  })(); }, []);

  useEffect(() => { (async ()=>{
    if (!selected) return;
    const r = await fetch(`/api/admin/roles/${selected.id}/allowed-modules`);
    const j = await r.json();
    if (j?.ok) setAllowed(j.data);
  })(); }, [selected]);

  const add = async () => {
    if (!selected || !newModule.trim()) return;
    await fetch(`/api/admin/roles/${selected.id}/allowed-modules`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ moduleKey: newModule.trim() }) });
    setNewModule('');
    const r = await fetch(`/api/admin/roles/${selected.id}/allowed-modules`);
    const j = await r.json();
    if (j?.ok) setAllowed(j.data);
  };

  const remove = async (moduleKey: string) => {
    if (!selected) return;
    const u = new URL(window.location.origin + `/api/admin/roles/${selected.id}/allowed-modules`);
    u.searchParams.set('moduleKey', moduleKey);
    await fetch(u.toString(), { method: 'DELETE' });
    const r = await fetch(`/api/admin/roles/${selected.id}/allowed-modules`);
    const j = await r.json();
    if (j?.ok) setAllowed(j.data);
  };

  return (
    <div className="p-4 border rounded-lg bg-white dark:bg-slate-900">
      <div className="flex gap-4">
        <div className="w-64">
          <div className="font-semibold mb-2">Roles</div>
          <ul className="border rounded">
            {roles.map(r => (
              <li key={r.id} className={`px-3 py-2 cursor-pointer ${selected?.id===r.id? 'bg-indigo-50 dark:bg-indigo-900/30':''}`} onClick={()=>setSelected(r)}>
                <div className="text-sm font-medium">{r.name}</div>
                <div className="text-xs text-gray-500">{r.key}</div>
              </li>
            ))}
          </ul>
        </div>
        <div className="flex-1">
          <div className="font-semibold mb-2">Allowed Modules</div>
          {!selected ? (
            <div className="text-sm text-gray-500">Select a role</div>
          ) : (
            <div>
              <div className="flex gap-2 mb-3">
                <input className="border rounded px-2 py-1 text-sm" placeholder="MODULE_KEY (e.g., BILLING)" value={newModule} onChange={e=>setNewModule(e.target.value)} />
                <button onClick={add} className="px-2 py-1 bg-indigo-600 text-white rounded text-sm">Add</button>
              </div>
              <div className="flex flex-wrap gap-2">
                {allowed.map(a => (
                  <span key={a.id} className="px-2 py-1 text-xs rounded-full bg-gray-100 dark:bg-slate-800 border">
                    {a.moduleKey}
                    <button onClick={()=>remove(a.moduleKey)} className="ml-2 text-red-600">×</button>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
