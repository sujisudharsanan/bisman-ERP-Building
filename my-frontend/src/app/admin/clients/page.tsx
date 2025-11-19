"use client";

import React, { useEffect, useState } from "react";
import PermissionGuard from "@/common/components/PermissionGuard";
import Link from "next/link";

type Client = {
  id: number | string;
  name: string;
  code?: string | null;
  created_at?: string;
};

export default function AdminClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [creating, setCreating] = useState(false);

  async function loadClients() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/system/clients", { cache: "no-store" });
      if (!res.ok) throw new Error(`Failed to load clients (${res.status})`);
  const json = await res.json();
  const list = Array.isArray(json) ? json : json?.data || [];
  setClients(list);
    } catch (e: any) {
      setError(e?.message || "Failed to load clients");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadClients();
  }, []);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/system/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), code: code.trim() || undefined }),
      });
      if (!res.ok) throw new Error(`Failed to create client (${res.status})`);
      setName("");
      setCode("");
      await loadClients();
    } catch (e: any) {
      setError(e?.message || "Failed to create client");
    } finally {
      setCreating(false);
    }
  }

  return (
    <PermissionGuard>
      <div className="p-6 max-w-4xl mx-auto">
        <h1 className="text-2xl font-semibold mb-4">Clients</h1>

        <form onSubmit={onCreate} className="mb-6 space-y-3 border rounded-md p-4">
          <div>
            <label className="block text-sm font-medium mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border rounded-md px-3 py-2"
              placeholder="Client name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Code (optional)</label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full border rounded-md px-3 py-2"
              placeholder="Unique code"
            />
          </div>
          <button
            type="submit"
            className="bg-blue-600 text-white px-4 py-2 rounded-md disabled:opacity-50"
            disabled={creating || !name.trim()}
          >
            {creating ? "Creating..." : "Create Client"}
          </button>
        </form>

        {loading ? (
          <div>Loading clients...</div>
        ) : error ? (
          <div className="text-red-600">{error}</div>
        ) : clients.length === 0 ? (
          <div>No clients found.</div>
        ) : (
          <div className="border rounded-md divide-y">
            {clients.map((c) => (
              <div key={c.id} className="flex items-center justify-between p-3">
                <div>
                  <div className="font-medium">{c.name}</div>
                  {c.code ? <div className="text-sm text-gray-500">Code: {c.code}</div> : null}
                </div>
                <Link href={`/admin/clients/${c.id}/permissions`} className="text-blue-600">Permissions</Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </PermissionGuard>
  );
}
