"use client";

import React, { useEffect, useMemo, useState } from "react";
import PermissionGuard from "@/common/components/PermissionGuard";
import Link from "next/link";
import { useParams } from "next/navigation";

type PermissionRow = {
  client_id: number;
  module_id: number;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
  module?: { id: number; name: string; code?: string | null };
};

export default function ClientPermissionsPage() {
  const params = useParams();
  const clientId = useMemo(() => Number(params?.id), [params]);
  const [rows, setRows] = useState<PermissionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function loadPermissions() {
    if (!clientId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/system/clients/${clientId}/permissions`, { cache: "no-store" });
      if (!res.ok) throw new Error(`Failed to load (${res.status})`);
      const json = await res.json();
      const data: PermissionRow[] = json?.data || json || [];
      setRows(data);
    } catch (e: any) {
      setError(e?.message || "Failed to load permissions");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPermissions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  async function updateOne(module_id: number, field: keyof Pick<PermissionRow, "can_view"|"can_create"|"can_edit"|"can_delete">, value: boolean) {
    if (!clientId) return;
    setSaving(true);
    try {
      const body: any = { [field]: value };
      const res = await fetch(`/api/system/clients/${clientId}/permissions/${module_id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`Save failed (${res.status})`);
      // Optimistically update local state
      setRows((prev) => prev.map((r) => (r.module_id === module_id ? { ...r, [field]: value } as PermissionRow : r)));
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  }

  return (
    <PermissionGuard>
      <div className="p-6 max-w-5xl mx-auto">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Client Permissions</h1>
          <Link className="text-blue-600" href="/admin/clients">Back to Clients</Link>
        </div>
        {loading ? (
          <div>Loading...</div>
        ) : error ? (
          <div className="text-red-600">{error}</div>
        ) : rows.length === 0 ? (
          <div>No modules found.</div>
        ) : (
          <div className="overflow-x-auto border rounded-md">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left p-2">Module</th>
                  <th className="p-2">View</th>
                  <th className="p-2">Create</th>
                  <th className="p-2">Edit</th>
                  <th className="p-2">Delete</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.module_id} className="border-t">
                    <td className="p-2">
                      <div className="font-medium">{r.module?.name || r.module_id}</div>
                      {r.module?.code ? (
                        <div className="text-gray-500 text-xs">{r.module.code}</div>
                      ) : null}
                    </td>
                    {["can_view","can_create","can_edit","can_delete"].map((f) => {
                      const field = f as keyof Pick<PermissionRow, "can_view"|"can_create"|"can_edit"|"can_delete">;
                      return (
                        <td key={f} className="p-2 text-center">
                          <input
                            type="checkbox"
                            checked={Boolean(r[field])}
                            disabled={saving}
                            onChange={(e) => updateOne(r.module_id, field, e.target.checked)}
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </PermissionGuard>
  );
}
