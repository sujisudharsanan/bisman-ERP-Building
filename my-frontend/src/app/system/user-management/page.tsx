"use client";

import React, { useEffect, useState } from 'react';
import SuperAdminShell from '@/components/layouts/SuperAdminShell';
import ClientManagementTabs from '@/components/common/ClientManagementTabs';
import ClientForm from '@/components/clients/ClientForm';
import API_BASE from '@/config/api';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';

interface Client {
  id: string;
  name: string;
  legal_name?: string | null;
  client_code?: string | null;
  client_type?: string | null;
  tax_id?: string | null;
  status?: string | null;
  trade_name?: string | null;
  registration_number?: string | null;
  industry?: string | null;
  business_size?: string | null;
  sales_representative?: string | null;
  primary_address?: any;
  primary_contact?: any;
  secondary_contact?: any;
  currency?: string | null;
  country_code?: string | null;
  timezone?: string | null;
  bank_details?: any;
  compliance?: any;
  operational?: any;
  user_access?: any;
  settings?: any;
  client_id?: string | null;
  [key: string]: any;
}

export default function ClientManagementPage() {
  const { user } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [isEditOpen, setIsEditOpen] = useState<boolean>(false);
  const [editClient, setEditClient] = useState<Client | null>(null);

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

  function closeEdit() {
    setIsEditOpen(false);
    setEditClient(null);
  }

  function handleEditSuccess() {
    closeEdit();
    fetchClients();
    alert('Client updated successfully');
  }

  function getClientFormInitial(client: Client) {
    return {
      legal_name: client.legal_name || client.name || '',
      trade_name: client.trade_name || '',
      client_type: client.client_type || client.settings?.enterprise?.client_type || 'Not Registered',
      erp_registration_type: client.settings?.enterprise?.meta?.erp_registration_type || 'registered',
      tax_id: client.tax_id || '',
      client_code: client.client_code || client.client_id || '',
      registration_number: client.registration_number || '',
      industry: client.industry || '',
      business_size: client.business_size || '',
      sales_representative: client.sales_representative || '',
      primary_address: client.primary_address || { line1: '', line2: '', city: '', state: '', country: '', pincode: '' },
      primary_contact: client.primary_contact || { name: '', role: '', phone: '', phone_code: '+91', email: '' },
      secondary_contact: client.secondary_contact || { name: '', role: '', phone: '', phone_code: '+91', email: '' },
      currency: client.currency || client.settings?.currency || 'INR',
      country_code: client.country_code || client.settings?.country_code || 'IN',
      timezone: client.timezone || client.settings?.timezone || 'Asia/Kolkata',
      status: client.status || 'Active',
      bank_details: client.bank_details || { account_name: '', bank_name: '', branch: '', account_number: '', swift: '', ifsc: '', iban: '' },
      compliance: client.compliance || { risk_category: 'Low', aml_status: 'Pending', verification_date: '', approved_by: '', blacklist: false },
      operational: client.operational || { service_area: '', category: '', preferred_delivery: '', sla: '' },
      user_access: client.user_access || { username: '', role: 'Client', modules: [] },
    };
  }

  const filtered = clients.filter((c: Client) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    const fields = [c.legal_name || c.name, c.client_code, c.client_type, c.tax_id];
    return fields.some((v) => (v || '').toLowerCase().includes(q));
  });

  return (
    <SuperAdminShell>
      <div className="p-4 md:p-6">
        <ClientManagementTabs />

        <div className="flex justify-end gap-2 mb-4">
          <button onClick={fetchClients} className="inline-flex items-center px-3 py-2 border rounded-md text-sm dark:border-gray-600 dark:text-gray-200">
            <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <polyline points="23 4 23 10 17 10" />
              <polyline points="1 20 1 14 7 14" />
              <path d="M3.51 9a9 9 0 0 1 14.13-3.36L23 10" />
              <path d="M20.49 15a9 9 0 0 1-14.13 3.36L1 14" />
            </svg>
            Refresh
          </button>
          <Link href="/clients/create" className="inline-flex items-center px-3 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700">
            <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Create New Client
          </Link>
        </div>

        {isEditOpen && editClient && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50" onClick={closeEdit} />
            <div className="relative bg-white dark:bg-gray-800 w-[95vw] max-w-5xl rounded-lg shadow-lg flex flex-col max-h-[90vh]">
              <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10 rounded-t-lg">
                <h2 className="text-lg sm:text-xl font-semibold dark:text-white">Edit Client: {editClient.legal_name || editClient.name}</h2>
                <button onClick={closeEdit} className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700">
                  <svg className="w-5 h-5 dark:text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
              <div className="overflow-y-auto flex-1">
                <ClientForm
                  mode="edit"
                  clientId={editClient.id}
                  initial={getClientFormInitial(editClient)}
                  onSuccess={handleEditSuccess}
                />
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
                <svg className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <circle cx="11" cy="11" r="7" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
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
                      {item?.settings?.enterprise?.status || item.status || 'Active'}
                    </span>
                    <button onClick={() => openEdit(item)} className="inline-flex items-center px-2 py-1 border rounded-md text-xs dark:border-gray-600 dark:text-gray-200">
                      <svg className="w-3 h-3 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <path d="M11 4h-1a2 2 0 0 0-2 2v1" />
                        <path d="M21 11l-8 8-4 1 1-4 8-8" />
                      </svg>
                      Edit
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
