"use client";

import React, { useEffect, useState } from 'react';
import SuperAdminShell from '@/components/layouts/SuperAdminShell';
import ClientManagementTabs from '@/components/common/ClientManagementTabs';
import API_BASE from '@/config/api';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';

// Inline icons
function Icon(props: React.SVGProps<SVGSVGElement> & { children?: any }) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
      {props.children}
    </svg>
  );
}

const SearchIcon = (p: React.SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <circle cx="11" cy="11" r="7" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </Icon>
);

const RefreshIcon = (p: React.SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <polyline points="23 4 23 10 17 10" />
    <polyline points="1 20 1 14 7 14" />
    <path d="M3.51 9a9 9 0 0 1 14.13-3.36L23 10" />
    <path d="M20.49 15a9 9 0 0 1-14.13 3.36L1 14" />
  </Icon>
);

const PlusIcon = (p: React.SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </Icon>
);

const EditIcon = (p: React.SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <path d="M11 4h-1a2 2 0 0 0-2 2v1" />
    <path d="M21 11l-8 8-4 1 1-4 8-8" />
  </Icon>
);

const XIcon = (p: React.SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </Icon>
);

// Types
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
  [key: string]: any;
}

export default function ClientManagementPage() {
  const { user } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [isEditOpen, setIsEditOpen] = useState<boolean>(false);
  const [editClient, setEditClient] = useState<Client | null>(null);
  const [editForm, setEditForm] = useState<any>({});

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
  }, []);

  function openEdit(c: Client) {
    setEditClient(c);
    setIsEditOpen(true);
  }

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

  const filtered = clients.filter((c) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    const fields = [c.legal_name || c.name, c.client_code, c.client_type, c.tax_id];
    return fields.some((v) => (v || '').toLowerCase().includes(q));
  });

  return (
    <SuperAdminShell>
      <div className="p-4 md:p-6">
        {/* Shared Tabs Navigation */}
        <ClientManagementTabs />

        {/* Action Buttons */}
        <div className="flex justify-end gap-2 mb-4">
          <button onClick={fetchClients} className="inline-flex items-center px-3 py-2 border rounded-md text-sm dark:border-gray-600 dark:text-gray-200">
            <RefreshIcon className="w-4 h-4 mr-2" /> Refresh
          </button>
          <Link href="/clients/create" className="inline-flex items-center px-3 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700">
            <PlusIcon className="w-4 h-4 mr-2" /> Create New Client
          </Link>
        </div>

        {/* Client Content */}
        <>
            {/* Edit Modal */}
            {isEditOpen && editClient && (
              <div className="fixed inset-0 z-50 flex items-center justify-center">
                <div className="absolute inset-0 bg-black/50" onClick={() => setIsEditOpen(false)} />
                <div className="relative bg-white dark:bg-gray-800 w-[95vw] max-w-2xl md:max-w-3xl lg:max-w-4xl rounded-lg shadow-lg flex flex-col max-h-[90vh]">
                  <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10 rounded-t-lg">
                    <h2 className="text-lg sm:text-xl font-semibold dark:text-white">Edit Client</h2>
                    <button onClick={() => setIsEditOpen(false)} className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700">
                      <XIcon className="w-5 h-5 dark:text-gray-300" />
                    </button>
                  </div>
                  <div className="px-4 sm:px-6 py-4 overflow-y-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm text-gray-600 dark:text-gray-300">Legal Name*</label>
                        <input value={editForm.legal_name} onChange={(e) => setEditForm({ ...editForm, legal_name: e.target.value })} className="w-full border rounded p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-600 dark:text-gray-300">Trade Name</label>
                        <input value={editForm.trade_name} onChange={(e) => setEditForm({ ...editForm, trade_name: e.target.value })} className="w-full border rounded p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-600 dark:text-gray-300">Client Code / ID</label>
                        <input value={editForm.client_code} onChange={(e) => setEditForm({ ...editForm, client_code: e.target.value })} className="w-full border rounded p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-600 dark:text-gray-300">Entity Type</label>
                        <select value={editForm.client_type} onChange={(e) => setEditForm({ ...editForm, client_type: e.target.value })} className="w-full border rounded p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                          <option>Private Limited</option>
                          <option>Partnership</option>
                          <option>Proprietorship</option>
                          <option>Not Registered</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm text-gray-600 dark:text-gray-300">ERP Registration Type</label>
                        <select value={editForm.erp_registration_type || 'registered'} onChange={(e) => setEditForm({ ...editForm, erp_registration_type: e.target.value })} className="w-full border rounded p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                          <option value="trial">Trial</option>
                          <option value="temporary">Temporary</option>
                          <option value="registered">Registered</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm text-gray-600 dark:text-gray-300">Tax ID (GSTIN/VAT/PAN)</label>
                        <input value={editForm.tax_id} onChange={(e) => setEditForm({ ...editForm, tax_id: e.target.value })} className="w-full border rounded p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                      </div>
                    </div>

                    <div className="mt-4">
                      <h3 className="font-semibold mb-2 dark:text-white">Primary Address</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input placeholder="Line 1" value={editForm.primary_address?.line1 || ''} onChange={(e) => setEditForm({ ...editForm, primary_address: { ...(editForm.primary_address || {}), line1: e.target.value } })} className="w-full border rounded p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                        <input placeholder="Line 2" value={editForm.primary_address?.line2 || ''} onChange={(e) => setEditForm({ ...editForm, primary_address: { ...(editForm.primary_address || {}), line2: e.target.value } })} className="w-full border rounded p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                        <input placeholder="City" value={editForm.primary_address?.city || ''} onChange={(e) => setEditForm({ ...editForm, primary_address: { ...(editForm.primary_address || {}), city: e.target.value } })} className="w-full border rounded p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                        <input placeholder="State" value={editForm.primary_address?.state || ''} onChange={(e) => setEditForm({ ...editForm, primary_address: { ...(editForm.primary_address || {}), state: e.target.value } })} className="w-full border rounded p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                        <input placeholder="Country" value={editForm.primary_address?.country || ''} onChange={(e) => setEditForm({ ...editForm, primary_address: { ...(editForm.primary_address || {}), country: e.target.value } })} className="w-full border rounded p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                        <input placeholder="PIN/ZIP" value={editForm.primary_address?.pincode || ''} onChange={(e) => setEditForm({ ...editForm, primary_address: { ...(editForm.primary_address || {}), pincode: e.target.value } })} className="w-full border rounded p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h3 className="font-semibold mb-2 dark:text-white">Primary Contact</h3>
                        <input placeholder="Name" className="w-full border rounded p-2 mb-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white" value={editForm.primary_contact?.name || ''} onChange={(e) => setEditForm({ ...editForm, primary_contact: { ...(editForm.primary_contact || {}), name: e.target.value } })} />
                        <input placeholder="Role/Designation" className="w-full border rounded p-2 mb-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white" value={editForm.primary_contact?.role || ''} onChange={(e) => setEditForm({ ...editForm, primary_contact: { ...(editForm.primary_contact || {}), role: e.target.value } })} />
                        <input placeholder="Phone" className="w-full border rounded p-2 mb-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white" value={editForm.primary_contact?.phone || ''} onChange={(e) => setEditForm({ ...editForm, primary_contact: { ...(editForm.primary_contact || {}), phone: e.target.value } })} />
                        <input placeholder="Email" className="w-full border rounded p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white" value={editForm.primary_contact?.email || ''} onChange={(e) => setEditForm({ ...editForm, primary_contact: { ...(editForm.primary_contact || {}), email: e.target.value } })} />
                      </div>
                      <div>
                        <h3 className="font-semibold mb-2 dark:text-white">Operational & Sales</h3>
                        <input placeholder="Industry / Business Category" className="w-full border rounded p-2 mb-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white" value={editForm.industry || ''} onChange={(e) => setEditForm({ ...editForm, industry: e.target.value })} />
                        <input placeholder="Business Size" className="w-full border rounded p-2 mb-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white" value={editForm.business_size || ''} onChange={(e) => setEditForm({ ...editForm, business_size: e.target.value })} />
                        <input placeholder="Sales Representative" className="w-full border rounded p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white" value={editForm.sales_representative || ''} onChange={(e) => setEditForm({ ...editForm, sales_representative: e.target.value })} />
                      </div>
                    </div>
                  </div>
                  <div className="px-4 sm:px-6 py-3 border-t dark:border-gray-700 bg-white dark:bg-gray-800 sticky bottom-0 z-10 rounded-b-lg flex justify-end gap-2">
                    <button onClick={() => setIsEditOpen(false)} className="px-4 py-2 border rounded dark:border-gray-600 dark:text-gray-200">Cancel</button>
                    <button onClick={updateClient} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Save Changes</button>
                  </div>
                </div>
              </div>
            )}

            {/* Clients List */}
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
                    <SearchIcon className="w-4 h-4 absolute left-3 top-2.5 text-gray-400 dark:text-gray-400" />
                  </div>
                  <button onClick={fetchClients} className="inline-flex items-center px-3 py-2 border rounded-md text-sm dark:border-gray-600 dark:text-gray-200">
                    Refresh
                  </button>
                </div>
              </div>

              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {loading ? (
                  <div className="p-8 text-center text-gray-500 dark:text-gray-300">Loading...</div>
                ) : filtered.length === 0 ? (
                  <div className="p-8 text-center text-gray-500 dark:text-gray-400">No records found</div>
                ) : (
                  filtered.map((item) => (
                    <div key={item.id} className="p-4 flex items-center justify-between border-b border-gray-200 dark:border-gray-700">
                      <div>
                        <div className="font-medium dark:text-white">
                          {item.legal_name || item.name} 
                          {item.client_code ? (
                            <span className="ml-2 text-xs text-gray-400">{item.client_code}</span>
                          ) : item.client_id ? (
                            <span className="ml-2 text-xs text-gray-400">{item.client_id}</span>
                          ) : null}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {item.client_type || item.client_code} {item.tax_id ? `• ${item.tax_id}` : ''} {item.sales_representative ? `• Sales: ${item.sales_representative}` : ''}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs px-2 py-1 rounded bg-gray-100 dark:bg-[#071018] text-gray-800 dark:text-gray-200">
                          {(item as any)?.settings?.enterprise?.status || item.status || 'Active'}
                        </span>
                        <button onClick={() => openEdit(item)} className="inline-flex items-center px-2 py-1 border rounded-md text-xs dark:border-gray-600 dark:text-gray-200">
                          <EditIcon className="w-3 h-3 mr-1" /> Edit
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
      </div>
    </SuperAdminShell>
  );
}
