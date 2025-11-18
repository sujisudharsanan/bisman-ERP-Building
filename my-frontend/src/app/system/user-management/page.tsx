'use client';

import React, { useEffect, useState } from 'react';
import SuperAdminShell from '@/components/layouts/SuperAdminShell';
import API_BASE from '@/config/api';
import { Search, RefreshCw, Plus, Edit, XCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';

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
  const [isEditOpen, setIsEditOpen] = useState<boolean>(false);
  const [editClient, setEditClient] = useState<Client | null>(null);
  const [lastCreatedClientId, setLastCreatedClientId] = useState<string | null>(null);
  const [form, setForm] = useState({
    legal_name: '',
    trade_name: '',
    // Legal entity type selector
    client_type: 'Not Registered',
    erp_registration_type: 'registered',
    tax_id: '',
    client_code: '',
    registration_number: '',
    business_size: '',
    industry: '',
    sales_representative: '',
  currency: 'INR',
  payment_terms: 'Net 30',
  credit_limit: '',
  billing_cycle: 'Monthly',
  preferred_payment_method: '',
  bank_details: { account_name: '', bank_name: '', branch: '', account_number: '', swift: '', ifsc: '', iban: '' },
  documents: [],
  user_access: { username: '', role: 'Client', modules: [] as string[] },
  operational: { service_area: '', category: '', preferred_delivery: '', sla: '' },
  compliance: { risk_category: 'Low', aml_status: 'Pending', verification_date: '', approved_by: '', blacklist: false },
  status: 'Active',
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
      // Optionally request server-generated client id from a dedicated service
      const clientIdService = (window as any).__env?.CLIENT_ID_SERVICE || process?.env?.NEXT_PUBLIC_CLIENT_ID_SERVICE || null;
      if (clientIdService) {
        try {
          const idResp = await fetch(`${clientIdService}/api/client-ids`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-api-key': (window as any).__env?.CLIENT_ID_SERVICE_KEY },
            body: JSON.stringify({ region: form.primary_address?.country || undefined, format: 'uuid', signed: false }),
          });
          const idJson = await idResp.json();
          if (idResp.ok && idJson.client_id) {
            body.client_id = idJson.client_id;
          }
        } catch (e) {
          // ignore and continue with server-side generation
          console.warn('client id service unavailable', e);
        }
      }

      const res = await fetch(`${API_BASE}/api/system/clients`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
  const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to create client');
  // capture client id/code if returned
  const createdId = json.client_id || (json.client && (json.client.client_id || json.client.client_code)) || json.client_code || null;
  if (createdId) setLastCreatedClientId(createdId);
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
        client_type: 'Not Registered',
        erp_registration_type: 'registered',
        tax_id: '',
        client_code: '',
        registration_number: '',
        business_size: '',
        industry: '',
        sales_representative: '',
        currency: 'INR',
        payment_terms: 'Net 30',
        credit_limit: '',
        billing_cycle: 'Monthly',
        preferred_payment_method: '',
        bank_details: { account_name: '', bank_name: '', branch: '', account_number: '', swift: '', ifsc: '', iban: '' },
        documents: [],
        user_access: { username: '', role: 'Client', modules: [] },
        operational: { service_area: '', category: '', preferred_delivery: '', sla: '' },
        compliance: { risk_category: 'Low', aml_status: 'Pending', verification_date: '', approved_by: '', blacklist: false },
        status: 'Active',
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

  function openEdit(c: Client) {
    setEditClient(c);
    setIsEditOpen(true);
  }

  const [editForm, setEditForm] = useState<any>({});
  useEffect(() => {
    if (editClient) {
      setEditForm({
        legal_name: editClient.legal_name || editClient.name || '',
        trade_name: editClient.trade_name || '',
        client_type: editClient.client_type || editClient.settings?.enterprise?.client_type || 'Not Registered',
        erp_registration_type: editClient.settings?.enterprise?.meta?.erp_registration_type || 'registered',
        tax_id: editClient.tax_id || '',
        client_code: editClient.client_code || editClient.client_id || '',
        registration_number: editClient.registration_number || '',
        industry: editClient.industry || '',
        business_size: editClient.business_size || '',
        sales_representative: editClient.sales_representative || '',
        primary_address: editClient.primary_address || { line1: '', line2: '', city: '', state: '', country: '', pincode: '' },
        primary_contact: editClient.primary_contact || { name: '', role: '', phone: '', email: '' },
      });
    } else {
      setEditForm({});
    }
  }, [editClient]);

  async function updateClient() {
    if (!editClient) return;
    try {
      const body: any = { ...editForm };
      if (body.erp_registration_type) {
        body.meta = { ...(body.meta || {}), erp_registration_type: body.erp_registration_type };
      }
      const res = await fetch(`${API_BASE}/api/system/clients/${encodeURIComponent(editClient.id)}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to update client');
      setIsEditOpen(false);
      setEditClient(null);
      fetchClients();
      alert('Client updated');
    } catch (e: any) {
      console.error(e);
      alert(e.message || 'Failed to update client');
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
      if ((body as any).erp_registration_type) {
        body.meta = { ...(body.meta || {}), erp_registration_type: (body as any).erp_registration_type };
      }
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
        client_type: 'Not Registered',
        erp_registration_type: 'registered',
        tax_id: '',
        client_code: '',
        registration_number: '',
        business_size: '',
        industry: '',
        sales_representative: '',
        currency: 'INR',
        payment_terms: 'Net 30',
        credit_limit: '',
        billing_cycle: 'Monthly',
        preferred_payment_method: '',
        bank_details: { account_name: '', bank_name: '', branch: '', account_number: '', swift: '', ifsc: '', iban: '' },
        documents: [],
        user_access: { username: '', role: 'Client', modules: [] },
        operational: { service_area: '', category: '', preferred_delivery: '', sla: '' },
        compliance: { risk_category: 'Low', aml_status: 'Pending', verification_date: '', approved_by: '', blacklist: false },
        status: 'Active',
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
            <Link href="/clients/create" className="inline-flex items-center px-3 py-2 bg-blue-600 text-white rounded-md text-sm">
              <Plus className="w-4 h-4 mr-2" /> Create New Client
            </Link>
          </div>
        </div>

        {isEditOpen && editClient && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50" onClick={() => setIsEditOpen(false)} />
            <div className="relative bg-white w-[95vw] max-w-2xl md:max-w-3xl lg:max-w-4xl rounded-lg shadow-lg flex flex-col max-h-[90vh]">
              <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b sticky top-0 bg-white z-10 rounded-t-lg">
                <h2 className="text-lg sm:text-xl font-semibold">Edit Client</h2>
                <button onClick={() => setIsEditOpen(false)} className="p-2 rounded hover:bg-gray-100">
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
              <div className="px-4 sm:px-6 py-4 overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-600">Legal Name*</label>
                    <input value={editForm.legal_name} onChange={(e) => setEditForm({ ...editForm, legal_name: e.target.value })} className="w-full border rounded p-2" />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600">Trade Name</label>
                    <input value={editForm.trade_name} onChange={(e) => setEditForm({ ...editForm, trade_name: e.target.value })} className="w-full border rounded p-2" />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600">Client Code / ID</label>
                    <input value={editForm.client_code} onChange={(e) => setEditForm({ ...editForm, client_code: e.target.value })} className="w-full border rounded p-2" />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600">Entity Type (Company Registration)</label>
                    <select value={editForm.client_type} onChange={(e) => setEditForm({ ...editForm, client_type: e.target.value })} className="w-full border rounded p-2">
                      <option>Private Limited</option>
                      <option>Partnership</option>
                      <option>Proprietorship</option>
                      <option>Not Registered</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600">ERP Registration Type</label>
                    <select value={editForm.erp_registration_type || 'registered'} onChange={(e) => setEditForm({ ...editForm, erp_registration_type: e.target.value })} className="w-full border rounded p-2">
                      <option value="trial">Trial</option>
                      <option value="temporary">Temporary</option>
                      <option value="registered">Registered</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600">Tax ID (GSTIN/VAT/PAN)</label>
                    <input value={editForm.tax_id} onChange={(e) => setEditForm({ ...editForm, tax_id: e.target.value })} className="w-full border rounded p-2" />
                  </div>
                </div>

                <div className="mt-4">
                  <h3 className="font-semibold mb-2">Primary Address</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input placeholder="Line 1" value={editForm.primary_address?.line1 || ''} onChange={(e) => setEditForm({ ...editForm, primary_address: { ...(editForm.primary_address || {}), line1: e.target.value } })} className="w-full border rounded p-2" />
                    <input placeholder="Line 2" value={editForm.primary_address?.line2 || ''} onChange={(e) => setEditForm({ ...editForm, primary_address: { ...(editForm.primary_address || {}), line2: e.target.value } })} className="w-full border rounded p-2" />
                    <input placeholder="City" value={editForm.primary_address?.city || ''} onChange={(e) => setEditForm({ ...editForm, primary_address: { ...(editForm.primary_address || {}), city: e.target.value } })} className="w-full border rounded p-2" />
                    <input placeholder="State" value={editForm.primary_address?.state || ''} onChange={(e) => setEditForm({ ...editForm, primary_address: { ...(editForm.primary_address || {}), state: e.target.value } })} className="w-full border rounded p-2" />
                    <input placeholder="Country" value={editForm.primary_address?.country || ''} onChange={(e) => setEditForm({ ...editForm, primary_address: { ...(editForm.primary_address || {}), country: e.target.value } })} className="w-full border rounded p-2" />
                    <input placeholder="PIN/ZIP" value={editForm.primary_address?.pincode || ''} onChange={(e) => setEditForm({ ...editForm, primary_address: { ...(editForm.primary_address || {}), pincode: e.target.value } })} className="w-full border rounded p-2" />
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-semibold mb-2">Primary Contact</h3>
                    <input placeholder="Name" className="w-full border rounded p-2 mb-2" value={editForm.primary_contact?.name || ''} onChange={(e) => setEditForm({ ...editForm, primary_contact: { ...(editForm.primary_contact || {}), name: e.target.value } })} />
                    <input placeholder="Role/Designation" className="w-full border rounded p-2 mb-2" value={editForm.primary_contact?.role || ''} onChange={(e) => setEditForm({ ...editForm, primary_contact: { ...(editForm.primary_contact || {}), role: e.target.value } })} />
                    <input placeholder="Phone" className="w-full border rounded p-2 mb-2" value={editForm.primary_contact?.phone || ''} onChange={(e) => setEditForm({ ...editForm, primary_contact: { ...(editForm.primary_contact || {}), phone: e.target.value } })} />
                    <input placeholder="Email" className="w-full border rounded p-2" value={editForm.primary_contact?.email || ''} onChange={(e) => setEditForm({ ...editForm, primary_contact: { ...(editForm.primary_contact || {}), email: e.target.value } })} />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">Operational & Sales</h3>
                    <input placeholder="Industry / Business Category" className="w-full border rounded p-2 mb-2" value={editForm.industry || ''} onChange={(e) => setEditForm({ ...editForm, industry: e.target.value })} />
                    <input placeholder="Business Size" className="w-full border rounded p-2 mb-2" value={editForm.business_size || ''} onChange={(e) => setEditForm({ ...editForm, business_size: e.target.value })} />
                    <input placeholder="Sales Representative" className="w-full border rounded p-2" value={editForm.sales_representative || ''} onChange={(e) => setEditForm({ ...editForm, sales_representative: e.target.value })} />
                  </div>
                </div>
              </div>
              <div className="px-4 sm:px-6 py-3 border-t bg-white sticky bottom-0 z-10 rounded-b-lg flex justify-end gap-2">
                <button onClick={() => setIsEditOpen(false)} className="px-4 py-2 border rounded">Cancel</button>
                <button onClick={updateClient} className="px-4 py-2 bg-blue-600 text-white rounded">Save Changes</button>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white dark:bg-[#0c111b] rounded-lg shadow overflow-hidden border border-gray-200 dark:border-gray-700">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
                <div className="relative">
                <input
                  type="text"
                  placeholder="Search clients..."
                  className="pl-10 pr-4 py-2 border rounded-md w-64 bg-white dark:bg-[#071018] text-gray-900 dark:text-gray-200 border-gray-300 dark:border-gray-600 placeholder-gray-400 dark:placeholder-gray-500"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400 dark:text-gray-400" />
              </div>
              <button onClick={fetchClients} className="inline-flex items-center px-3 py-2 border rounded-md text-sm">
                Refresh
              </button>
            </div>
          </div>

          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {loading ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-300">Loading...</div>
            ) : filtered.length === 0 ? (
              <div className="p-8 text-center text-gray-500">No records found</div>
            ) : (
  filtered.map((item) => (
        <div key={item.id} className="p-4 flex items-center justify-between border-b border-gray-200 dark:border-gray-700">
                  <div>
                    <div className="font-medium">{item.legal_name || item.name} {item.client_code ? (<span className="ml-2 text-xs text-gray-400">{item.client_code}</span>) : (item.client_id ? <span className="ml-2 text-xs text-gray-400">{item.client_id}</span> : null)}</div>
                    <div className="text-sm text-gray-500">
                      {item.client_type || item.client_code} {item.tax_id ? `• ${item.tax_id}` : ''} {item.sales_representative ? `• Sales: ${item.sales_representative}` : ''}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
  <span className="text-xs px-2 py-1 rounded bg-gray-100 dark:bg-[#071018] text-gray-800 dark:text-gray-200">{(item as any)?.settings?.enterprise?.status || item.status || 'Active'}</span>
                    <button onClick={() => openEdit(item)} className="inline-flex items-center px-2 py-1 border rounded-md text-xs">
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
