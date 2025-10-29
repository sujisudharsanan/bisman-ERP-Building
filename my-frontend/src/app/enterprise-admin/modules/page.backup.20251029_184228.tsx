"use client";

import React, { useEffect, useMemo, useState } from "react";
import { FiUsers, FiPackage, FiGrid, FiCheckCircle } from "react-icons/fi";

type Module = { id: string; key: string; name: string };
type SuperAdmin = { id: string; name?: string; email?: string; role?: string; productType?: string };
type Registry = {
  // Very loose type; depends on generated layout_registry.json
  pages?: Array<{ path: string; title?: string; module?: string; moduleKey?: string }>;
};

const CATEGORIES = [
  { key: "business", label: "Business ERP", color: "purple" },
  { key: "pump", label: "Pump Management", color: "orange" },
];

export default function Page() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modules, setModules] = useState<Module[]>([]);
  const [superAdmins, setSuperAdmins] = useState<SuperAdmin[]>([]);
  const [registry, setRegistry] = useState<Registry | null>(null);

  const [category, setCategory] = useState<string | null>(null);
  const [selectedAdminId, setSelectedAdminId] = useState<string | null>(null);
  const [selectedModuleKey, setSelectedModuleKey] = useState<string | null>(null);
  const [selectedPageIds, setSelectedPageIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [modsRes, usersRes, regRes] = await Promise.all([
          fetch("/api/admin/modules"),
          fetch("/api/admin/users"),
          fetch("/layout_registry.json").catch(() => new Response("{}")),
        ]);
        const modsData = await modsRes.json().catch(() => ({}));
        const usersData = await usersRes.json().catch(() => ({}));
        const registryData = await regRes.json().catch(() => ({}));

        setModules(modsData?.data ?? modsData ?? []);
        setSuperAdmins(usersData?.data ?? usersData ?? []);
        setRegistry(registryData);
      } catch (e: any) {
        setError(e?.message || "Failed to load data");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const categoryCounts = useMemo(() => {
    const isPump = (m: Module) => m.key?.toLowerCase().includes("pump");
    return {
      business: modules.filter((m) => !isPump(m)).length,
      pump: modules.filter((m) => isPump(m)).length,
    };
  }, [modules]);

  const filteredAdmins = useMemo(() => {
    if (!category) return superAdmins;
    // If productType is available, filter by it. Otherwise, show all.
    return superAdmins.filter((s) => !s.productType || s.productType.toLowerCase().includes(category));
  }, [superAdmins, category]);

  const filteredModules = useMemo(() => {
    if (!category) return modules;
    const isPump = (m: Module) => m.key?.toLowerCase().includes("pump");
    return modules.filter((m) => (category === "pump" ? isPump(m) : !isPump(m)));
  }, [modules, category]);

  const pagesForSelectedModule = useMemo(() => {
    if (!registry || !selectedModuleKey) return [] as { id: string; title?: string; path: string }[];
    const pages = Array.isArray(registry.pages) ? registry.pages : [];
    // Heuristic: match by moduleKey or module or search by path containing the module key
    const matched = pages.filter((p) => {
      const mk = (p as any).moduleKey || (p as any).module;
      if (mk && typeof mk === "string") return mk.toLowerCase().includes(selectedModuleKey.toLowerCase());
      return p.path?.toLowerCase().includes(selectedModuleKey.toLowerCase());
    });
    return matched.map((p) => ({ id: p.path, title: p.title, path: p.path }));
  }, [registry, selectedModuleKey]);

  const togglePage = (id: string) => {
    setSelectedPageIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };
  const toggleAllPages = () => {
    const all = pagesForSelectedModule.map((p) => p.id);
    const allSelected = selectedPageIds.length === all.length;
    setSelectedPageIds(allSelected ? [] : all);
  };

  const assignPages = async () => {
    if (!selectedAdminId || !selectedModuleKey) return;
    try {
      setSaving(true);
      await fetch(`/api/enterprise-admin/super-admins/${selectedAdminId}/assign-module`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ moduleId: selectedModuleKey, pages: selectedPageIds }),
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-4">Loading…</div>;
  if (error) return <div className="p-4 text-red-600">{error}</div>;

  return (
    <div className="space-y-6 text-gray-900 dark:text-gray-100">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Module Management</h1>
        <button
          onClick={() => {
            // simple refetch
            setLoading(true);
            Promise.all([
              fetch("/api/admin/modules"),
              fetch("/api/admin/users"),
              fetch("/layout_registry.json").catch(() => new Response("{}")),
            ])
              .then(async ([m, u, r]) => {
                const md = await m.json().catch(() => ({}));
                const ud = await u.json().catch(() => ({}));
                const rd = await r.json().catch(() => ({}));
                setModules(md?.data ?? md ?? []);
                setSuperAdmins(ud?.data ?? ud ?? []);
                setRegistry(rd);
              })
              .finally(() => setLoading(false));
          }}
          className="px-3 py-1.5 text-xs rounded-md border hover:bg-blue-50 dark:hover:bg-blue-900/30"
        >
          Refresh
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-lg border bg-white/40 dark:bg-gray-900/30 p-3">
          <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded bg-blue-100 dark:bg-blue-900/40">
              <FiUsers className="text-blue-600" />
            </span>
            Total Super Admins
          </div>
          <div className="text-xl font-semibold mt-1">{superAdmins.length}</div>
        </div>
        <div className="rounded-lg border bg-white/40 dark:bg-gray-900/30 p-3">
          <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded bg-purple-100 dark:bg-purple-900/30">
              <FiPackage className="text-purple-600" />
            </span>
            Total Modules
          </div>
          <div className="text-xl font-semibold mt-1">{modules.length}</div>
        </div>
        <div className="rounded-lg border bg-white/40 dark:bg-gray-900/30 p-3">
          <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded bg-indigo-100 dark:bg-indigo-900/30">
              <FiGrid className="text-indigo-600" />
            </span>
            Business ERP (Assigned)
          </div>
          <div className="text-xl font-semibold mt-1">0</div>
        </div>
        <div className="rounded-lg border bg-white/40 dark:bg-gray-900/30 p-3">
          <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded bg-orange-100 dark:bg-orange-900/30">
              <FiGrid className="text-orange-600" />
            </span>
            Pump Management (Assigned)
          </div>
          <div className="text-xl font-semibold mt-1">0</div>
        </div>
      </div>

      {/* Guidance tiles */}
      {(!category || !selectedModuleKey) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {!category && (
            <div className="rounded-lg border bg-white/40 dark:bg-gray-900/30 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <FiGrid className="text-blue-600" /> Select a Category
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                Choose Business ERP or Pump Management to view modules
              </p>
            </div>
          )}
          {!selectedModuleKey && (
            <div className="rounded-lg border bg-white/40 dark:bg-gray-900/30 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <FiCheckCircle className="text-green-600" /> Select a Module
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                Click a module from Column 3 to manage its pages
              </p>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* 1. Categories */}
        <div className="rounded-lg border bg-white/40 dark:bg-gray-900/30 p-3">
          <div className="text-sm font-semibold mb-2">Categories</div>
          <div className="space-y-2">
            {CATEGORIES.map((c) => (
              <button
                key={c.key}
                onClick={() => {
                  setCategory(c.key);
                  setSelectedModuleKey(null);
                  setSelectedPageIds([]);
                }}
                className={`w-full text-left rounded-md border px-3 py-2 text-sm transition ${
                  category === c.key
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30"
                    : "border-gray-200 dark:border-gray-700 hover:border-blue-300"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <span
                      className={`inline-block w-2 h-2 rounded-full ${
                        c.key === "pump" ? "bg-orange-500" : "bg-purple-600"
                      }`}
                    />
                    {c.label}
                  </span>
                  <span className="text-xs text-gray-500">
                    {c.key === "pump" ? categoryCounts.pump : categoryCounts.business}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* 2. Super Admins */}
        <div className="rounded-lg border bg-white/40 dark:bg-gray-900/30 p-3">
          <div className="text-sm font-semibold mb-2">Super Admins</div>
          <div className="space-y-1 max-h-[520px] overflow-y-auto">
            {filteredAdmins.length === 0 && (
              <div className="text-xs text-gray-500">No Super Admins</div>
            )}
            {filteredAdmins.map((a) => (
              <button
                key={a.id}
                onClick={() => setSelectedAdminId(a.id)}
                className={`w-full text-left rounded-md border px-3 py-2 text-xs transition ${
                  selectedAdminId === a.id
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30"
                    : "border-gray-200 dark:border-gray-700 hover:border-blue-300"
                }`}
                title={a.email}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate">{a.name || a.email || a.id}</span>
                  <span className="text-[10px] text-gray-500">{a.role || "SUPER_ADMIN"}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* 3. Modules */}
        <div className="rounded-lg border bg-white/40 dark:bg-gray-900/30 p-3">
          <div className="text-sm font-semibold mb-2">Modules</div>
          <div className="space-y-1 max-h-[520px] overflow-y-auto">
            {filteredModules.length === 0 && (
              <div className="text-xs text-gray-500">No Modules</div>
            )}
            {filteredModules.map((m) => (
              <button
                key={m.id}
                onClick={() => {
                  setSelectedModuleKey(m.key);
                  setSelectedPageIds([]);
                }}
                className={`w-full text-left rounded-md border px-3 py-2 text-xs transition ${
                  selectedModuleKey === m.key
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30"
                    : "border-gray-200 dark:border-gray-700 hover:border-blue-300"
                }`}
                title={m.key}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate">{m.name}</span>
                  <span className="text-[10px] text-gray-500">{m.key}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* 4. Pages */}
        <div className="rounded-lg border bg-white/40 dark:bg-gray-900/30 p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-semibold">Pages</div>
            <div className="text-xs text-gray-500">
              {selectedPageIds.length} selected
            </div>
          </div>
          {!selectedModuleKey ? (
            <div className="text-xs text-gray-500">Select a module to view pages</div>
          ) : pagesForSelectedModule.length === 0 ? (
            <div className="text-xs text-gray-500">No pages found for this module</div>
          ) : (
            <div className="space-y-1 max-h-[460px] overflow-y-auto">
              <div className="flex items-center gap-2 mb-2">
                <button
                  onClick={toggleAllPages}
                  className="px-2 py-1 text-xs rounded border hover:bg-blue-50 dark:hover:bg-blue-900/30"
                >
                  {selectedPageIds.length === pagesForSelectedModule.length ? "Deselect All" : "Select All"}
                </button>
                <button
                  disabled={!selectedAdminId || saving}
                  onClick={assignPages}
                  className="px-2 py-1 text-xs rounded border bg-green-600 text-white disabled:opacity-60"
                >
                  {saving ? "Saving..." : "Assign"}
                </button>
              </div>
              {pagesForSelectedModule.map((p) => {
                const checked = selectedPageIds.includes(p.id);
                return (
                  <label
                    key={p.id}
                    className={`flex items-center gap-2 rounded-md border px-3 py-2 text-xs cursor-pointer transition ${
                      checked
                        ? "border-green-500 bg-green-50 dark:bg-green-900/30"
                        : "border-gray-200 dark:border-gray-700 hover:border-blue-300"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => togglePage(p.id)}
                      className="accent-blue-600"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="truncate">{p.title || p.path}</div>
                      <div className="text-[10px] text-gray-500 truncate">{p.path}</div>
                    </div>
                  </label>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
