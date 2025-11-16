'use client';

import React, { useEffect, useState } from 'react';
import SuperAdminShell from '@/components/layouts/SuperAdminShell';
import API_BASE from '@/config/api';
import { Search, RefreshCw, Plus, Edit, XCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

// Minimal types used locally
type Address = { line1: string; line2?: string; city: string; state: string; country: string; pincode: string };
type Contact = { name: string; role?: string; phone: string; email: string };

interface Client {
  id: string;
  name: string;
  legal_name?: string | null;
  client_code?: string | null;
  client_type?: string | null;
  tax_id?: string | null;
  status?: string | null;
  // Pass-through for server JSON
  [key: string]: any;
}

export default function ClientManagementPage() {
  const { user } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [form, setForm] = useState({
    legal_name: '',
    trade_name: '',
    client_type: 'Company',
    tax_id: '',
    primary_address: { line1: '', line2: '', city: '', state: '', country: '', pincode: '' } as Address,
    primary_contact: { name: '', role: '', phone: '', email: '' } as Contact,
    secondary_contact: { name: '', role: '', phone: '', email: '' } as Contact,
  });
  const [saveAsDraft, setSaveAsDraft] = useState<boolean>(false);
  const [createAdminNow, setCreateAdminNow] = useState<boolean>(true);
  const [adminUser, setAdminUser] = useState<{ email: string; username?: string; password?: string }>({ email: '' });

  async function fetchClients() {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/system/clients`, { credentials: 'include' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to load clients');
      setClients(json.data || []);
    } catch (e: any) {
      console.error(e);
      alert(e.message || 'Failed to load clients');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchClients();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function saveClient() {
    if (!form.legal_name && !form.trade_name) {
      alert('Client Legal Name or Trade Name is required');
      return;
    }
    if (!form.primary_contact.name || !form.primary_contact.email || !form.primary_contact.phone) {
      alert('Primary contact name, email and phone are required');
      return;
    }
    if (createAdminNow && !adminUser.email) {
      alert('Admin email is required when provisioning an Admin now');
      return;
    }
    try {
  const body: any = { ...form, name: form.legal_name || form.trade_name };
  const sid = (user as any)?.super_admin_id ?? (user as any)?.superAdminId ?? (((user as any)?.role === 'SUPER_ADMIN' || (user as any)?.roleName === 'SUPER_ADMIN') ? (user as any)?.id : undefined);
  if (sid) body.super_admin_id = sid;
      body.saveAsDraft = !!saveAsDraft;
      if (createAdminNow) {
        body.adminUser = adminUser;
        body.ensurePermissions = true;
        body.defaultViewAll = true;
      }
      const res = await fetch(`${API_BASE}/api/system/clients`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to create client');
      // Success feedback including admin creds if generated
      if (json?.admin) {
        const parts = [
          `Admin created: ${json.admin.username} <${json.admin.email}>`,
        ];
        if (json?.tempPassword) parts.push(`Temporary password: ${json.tempPassword}`);
        alert(parts.join('\n'));
      } else if (saveAsDraft) {
        alert('Client saved as Draft');
      }
      setIsOpen(false);
      setForm({
        legal_name: '',
        trade_name: '',
        client_type: 'Company',
        tax_id: '',
        primary_address: { line1: '', line2: '', city: '', state: '', country: '', pincode: '' },
        primary_contact: { name: '', role: '', phone: '', email: '' },
        secondary_contact: { name: '', role: '', phone: '', email: '' },
      });
      setSaveAsDraft(false);
      setCreateAdminNow(true);
      setAdminUser({ email: '' });
      fetchClients();
    } catch (e: any) {
      console.error(e);
      alert(e.message || 'Failed to create client');
    }
  }

  // Save Draft: relaxed flow and forced draft mode; skips admin provisioning
  async function saveDraft() {
    if (!form.legal_name && !form.trade_name) {
      alert('Client Legal Name or Trade Name is required');
      return;
    }
    try {
  const body: any = { ...form, name: form.legal_name || form.trade_name };
  const sid = (user as any)?.super_admin_id ?? (user as any)?.superAdminId ?? (((user as any)?.role === 'SUPER_ADMIN' || (user as any)?.roleName === 'SUPER_ADMIN') ? (user as any)?.id : undefined);
  if (sid) body.super_admin_id = sid;
      body.saveAsDraft = true;
      const res = await fetch(`${API_BASE}/api/system/clients`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to save draft');
      alert('Client saved as Draft');
      setIsOpen(false);
      setForm({
        legal_name: '',
        trade_name: '',
        client_type: 'Company',
        tax_id: '',
        primary_address: { line1: '', line2: '', city: '', state: '', country: '', pincode: '' },
        primary_contact: { name: '', role: '', phone: '', email: '' },
        secondary_contact: { name: '', role: '', phone: '', email: '' },
      });
      setSaveAsDraft(false);
      setCreateAdminNow(true);
      setAdminUser({ email: '' });
      fetchClients();
    } catch (e: any) {
      console.error(e);
      alert(e.message || 'Failed to save draft');
    }
  }

  const filtered = clients.filter((c) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    const fields = [c.legal_name || c.name, c.client_code, c.client_type, c.tax_id];
    return fields.some((v) => (v || '').toLowerCase().includes(q));
  });

  return (
    <SuperAdminShell>
      <div className="p-4 md:p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold">Client Management</h1>
            <p className="text-gray-500">Create and manage enterprise client profiles</p>
          </div>
          <div className="flex gap-2">
            <button onClick={fetchClients} className="inline-flex items-center px-3 py-2 border rounded-md text-sm">
              <RefreshCw className="w-4 h-4 mr-2" /> Refresh
            </button>
            <button onClick={() => setIsOpen(true)} className="inline-flex items-center px-3 py-2 bg-blue-600 text-white rounded-md text-sm">
              <Plus className="w-4 h-4 mr-2" /> Create New Client
            </button>
          </div>
        </div>

        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/50" onClick={() => setIsOpen(false)} />

            {/* Modal container - responsive width and max height */}
            <div className="relative bg-white w-[95vw] max-w-2xl md:max-w-3xl lg:max-w-4xl rounded-lg shadow-lg flex flex-col max-h-[90vh]">
              {/* Header */}
              <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b sticky top-0 bg-white z-10 rounded-t-lg">
                <h2 className="text-lg sm:text-xl font-semibold">Create Client</h2>
                <button onClick={() => setIsOpen(false)} className="p-2 rounded hover:bg-gray-100">
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable body */}
              <div className="px-4 sm:px-6 py-4 overflow-y-auto">
                {/* Basics */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-600">Legal Name*</label>
                    <input value={form.legal_name} onChange={(e) => setForm({ ...form, legal_name: e.target.value })} className="w-full border rounded p-2" />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600">Trade Name</label>
                    <input value={form.trade_name} onChange={(e) => setForm({ ...form, trade_name: e.target.value })} className="w-full border rounded p-2" />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600">Client Type</label>
                    <select value={form.client_type} onChange={(e) => setForm({ ...form, client_type: e.target.value })} className="w-full border rounded p-2">
                      <option>Company</option>
                      <option>Individual</option>
                      <option>Distributor</option>
                      <option>Franchise</option>
                      <option>Vendor</option>
                      <option>Customer</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600">Tax ID (GSTIN/VAT/PAN)</label>
                    <input value={form.tax_id} onChange={(e) => setForm({ ...form, tax_id: e.target.value })} className="w-full border rounded p-2" />
                  </div>
                </div>

                {/* Primary Address */}
                <div className="mt-4">
                  <h3 className="font-semibold mb-2">Primary Address</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input placeholder="Line 1" value={form.primary_address.line1} onChange={(e) => setForm({
                      ...form,
                      primary_address: { ...form.primary_address, line1: e.target.value },
                    })} className="w-full border rounded p-2" />
                    <input placeholder="Line 2" value={form.primary_address.line2} onChange={(e) => setForm({
                      ...form,
                      primary_address: { ...form.primary_address, line2: e.target.value },
                    })} className="w-full border rounded p-2" />
                    <input placeholder="City" value={form.primary_address.city} onChange={(e) => setForm({
                      ...form,
                      primary_address: { ...form.primary_address, city: e.target.value },
                    })} className="w-full border rounded p-2" />
                    <input placeholder="State" value={form.primary_address.state} onChange={(e) => setForm({
                      ...form,
                      primary_address: { ...form.primary_address, state: e.target.value },
                    })} className="w-full border rounded p-2" />
                    <input placeholder="Country" value={form.primary_address.country} onChange={(e) => setForm({
                      ...form,
                      primary_address: { ...form.primary_address, country: e.target.value },
                    })} className="w-full border rounded p-2" />
                    <input placeholder="PIN/ZIP" value={form.primary_address.pincode} onChange={(e) => setForm({
                      ...form,
                      primary_address: { ...form.primary_address, pincode: e.target.value },
                    })} className="w-full border rounded p-2" />
                  </div>
                </div>

                {/* Contacts */}
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-semibold mb-2">Primary Contact</h3>
                    <input placeholder="Name" className="w-full border rounded p-2 mb-2" value={form.primary_contact.name} onChange={(e) => setForm({
                      ...form,
                      primary_contact: { ...form.primary_contact, name: e.target.value },
                    })} />
                    <input placeholder="Role/Designation" className="w-full border rounded p-2 mb-2" value={form.primary_contact.role} onChange={(e) => setForm({
                      ...form,
                      primary_contact: { ...form.primary_contact, role: e.target.value },
                    })} />
                    <input placeholder="Phone" className="w-full border rounded p-2 mb-2" value={form.primary_contact.phone} onChange={(e) => setForm({
                      ...form,
                      primary_contact: { ...form.primary_contact, phone: e.target.value },
                    })} />
                    <input placeholder="Email" className="w-full border rounded p-2" value={form.primary_contact.email} onChange={(e) => setForm({
                      ...form,
                      primary_contact: { ...form.primary_contact, email: e.target.value },
                    })} />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">Secondary Contact</h3>
                    <input placeholder="Name" className="w-full border rounded p-2 mb-2" value={form.secondary_contact.name} onChange={(e) => setForm({
                      ...form,
                      secondary_contact: { ...form.secondary_contact, name: e.target.value },
                    })} />
                    <input placeholder="Role/Designation" className="w-full border rounded p-2 mb-2" value={form.secondary_contact.role} onChange={(e) => setForm({
                      ...form,
                      secondary_contact: { ...form.secondary_contact, role: e.target.value },
                    })} />
                    <input placeholder="Phone" className="w-full border rounded p-2 mb-2" value={form.secondary_contact.phone} onChange={(e) => setForm({
                      ...form,
                      secondary_contact: { ...form.secondary_contact, phone: e.target.value },
                    })} />
                    <input placeholder="Email" className="w-full border rounded p-2" value={form.secondary_contact.email} onChange={(e) => setForm({
                      ...form,
                      secondary_contact: { ...form.secondary_contact, email: e.target.value },
                    })} />
                  </div>
                </div>

                {/* Admin provisioning */}
                <div className="mt-6">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">Provision Admin User</h3>
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={createAdminNow} onChange={(e) => setCreateAdminNow(e.target.checked)} />
                      Create admin now
                    </label>
                  </div>
                  {createAdminNow && (
                    <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="md:col-span-1">
                        <label className="block text-sm text-gray-600">Admin Email*</label>
                        <input type="email" className="w-full border rounded p-2" value={adminUser.email} onChange={(e) => setAdminUser({ ...adminUser, email: e.target.value })} />
                      </div>
                      <div className="md:col-span-1">
                        <label className="block text-sm text-gray-600">Username (optional)</label>
                        <input className="w-full border rounded p-2" value={adminUser.username || ''} onChange={(e) => setAdminUser({ ...adminUser, username: e.target.value })} />
                      </div>
                      <div className="md:col-span-1">
                        <label className="block text-sm text-gray-600">Password (optional)</label>
                        <input className="w-full border rounded p-2" type="password" value={adminUser.password || ''} onChange={(e) => setAdminUser({ ...adminUser, password: e.target.value })} />
                        <p className="text-xs text-gray-500 mt-1">Leave blank to auto-generate a secure password.</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Save as draft option removed; use the Save Draft button below */}
              </div>

              {/* Sticky footer actions */}
              <div className="px-4 sm:px-6 py-3 border-t bg-white sticky bottom-0 z-10 rounded-b-lg flex justify-end gap-2">
                <button onClick={() => setIsOpen(false)} className="px-4 py-2 border rounded">
                  Cancel
                </button>
                <button onClick={saveDraft} className="px-4 py-2 bg-blue-600 text-white rounded">
                  Save Draft
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-4 border-b flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search clients..."
                  className="pl-10 pr-4 py-2 border rounded-md w-64"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
              </div>
              <button onClick={fetchClients} className="inline-flex items-center px-3 py-2 border rounded-md text-sm">
                Refresh
              </button>
            </div>
          </div>

          <div className="divide-y">
            {loading ? (
              <div className="p-8 text-center text-gray-500">Loading...</div>
            ) : filtered.length === 0 ? (
              <div className="p-8 text-center text-gray-500">No records found</div>
            ) : (
      filtered.map((item) => (
                <div key={item.id} className="p-4 flex items-center justify-between">
                  <div>
                    <div className="font-medium">{item.legal_name || item.name}</div>
                    <div className="text-sm text-gray-500">
                      {item.client_code || item.client_type} {item.tax_id ? `• ${item.tax_id}` : ''}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
        <span className="text-xs px-2 py-1 rounded bg-gray-100">{(item as any)?.settings?.enterprise?.status || item.status || 'Active'}</span>
                    <button onClick={() => alert('Edit soon')} className="inline-flex items-center px-2 py-1 border rounded-md text-xs">
                      <Edit className="w-3 h-3 mr-1" /> Edit
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </SuperAdminShell>
  );
}
