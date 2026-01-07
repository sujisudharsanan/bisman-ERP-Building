"use client";

import React, { useEffect, useState } from 'react';
// Note: Layout is provided by /app/system/layout.tsx
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

  async function openEdit(c: Client) {
    // Fetch full client data including admin_users
    try {
      const res = await fetch(`${API_BASE}/api/system/clients/${c.id}`, { credentials: 'include' });
      const json = await res.json();
      if (res.ok && json.data) {
        setEditClient(json.data);
      } else {
        // Fallback to list data if fetch fails
        setEditClient(c);
      }
    } catch (e) {
      console.error('Failed to fetch client details:', e);
      setEditClient(c);
    }
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

  function getClientFormInitial(c: Client) {
    // Extract enterprise settings (where most detailed data is stored)
    const ent = c.settings?.enterprise || {};
    const addresses = ent.addresses || c.addresses || [];
    const contacts = ent.contacts || c.contact_persons || [];
    const primaryAddr = addresses.find((a: any) => a.type === 'registered' || a.primary) || addresses[0] || {};
    const primaryContact = contacts.find((ct: any) => ct.primary) || contacts[0] || {};
    const secondaryContact = contacts.find((ct: any) => !ct.primary) || contacts[1] || {};
    const registrations = ent.registrations || {};
    
    return {
      // Basic Info
      legal_name: ent.legal_name || c.legal_name || c.name || '',
      trade_name: ent.trade_name || c.trade_name || '',
      client_type: ent.client_type || c.client_type || 'Not Registered',
      erp_registration_type: ent.meta?.erp_registration_type || c.settings?.meta?.erp_registration_type || 'registered',
      tax_id: ent.tax_id || c.tax_id || '',
      client_code: ent.client_code || c.client_code || c.client_id || '',
      public_code: ent.public_code || c.public_code || '',
      registration_number: ent.registration_number || c.registration_number || '',
      business_size: ent.business_size || c.business_size || '',
      industry: ent.industry || c.industry || '',
      status: ent.status || c.status || 'Active',
      
      // Address
      primary_address: {
        line1: primaryAddr.line1 || '',
        line2: primaryAddr.line2 || '',
        city: primaryAddr.city || '',
        state: primaryAddr.state || '',
        country: primaryAddr.country || '',
        pincode: primaryAddr.pincode || primaryAddr.postal_code || '',
      },
      
      // Contacts
      primary_contact: {
        name: primaryContact.name || '',
        role: primaryContact.role || primaryContact.designation || '',
        phone: primaryContact.phone || primaryContact.mobile || '',
        phone_code: primaryContact.phone_code || '+91',
        email: primaryContact.email || '',
      },
      secondary_contact: {
        name: secondaryContact.name || '',
        role: secondaryContact.role || secondaryContact.designation || '',
        phone: secondaryContact.phone || secondaryContact.mobile || '',
        phone_code: secondaryContact.phone_code || '+91',
        email: secondaryContact.email || '',
      },
      
      // Financial
      currency: c.settings?.currency || ent.currency || 'INR',
      payment_terms: ent.payment_terms || ent.financial_details?.payment_terms || 'Net 30',
      credit_limit: ent.credit_limit || ent.financial_details?.credit_limit || '',
      billing_cycle: ent.billing_cycle || 'Monthly',
      bank_details: {
        account_name: (ent.bank_details || c.bank_details)?.account_name || '',
        bank_name: (ent.bank_details || c.bank_details)?.bank_name || '',
        branch: (ent.bank_details || c.bank_details)?.branch || '',
        account_number: (ent.bank_details || c.bank_details)?.account_number || '',
        swift: (ent.bank_details || c.bank_details)?.swift || '',
        ifsc: (ent.bank_details || c.bank_details)?.ifsc || '',
        iban: (ent.bank_details || c.bank_details)?.iban || '',
      },
      
      // Operational
      operational: {
        service_area: (ent.operational || c.operational)?.service_area || '',
        category: (ent.operational || c.operational)?.category || '',
        preferred_delivery: (ent.operational || c.operational)?.preferred_delivery || '',
        sla: (ent.operational || c.operational)?.sla || '',
      },
      
      // Compliance / Risk
      compliance: {
        risk_category: (ent.risk || c.risk)?.level || 'Low',
        aml_status: ent.compliance?.aml_status || 'Pending',
        verification_date: ent.compliance?.verification_date || '',
        approved_by: ent.compliance?.approved_by || '',
        blacklist: ent.compliance?.blacklist || false,
        kyc_status: ent.compliance?.kyc_status || 'UNVERIFIED',
        risk_score: (ent.risk || c.risk)?.score || 0,
      },
      
      // Sales & Segmentation
      sales_representative: ent.sales_representative || c.sales_representative || '',
      sales_team: ent.sales_team || [],
      segment: ent.segment || 'SMB',
      tier: ent.tier || 'Bronze',
      lifecycle_stage: ent.lifecycle_stage || c.onboarding_status || 'trial',
      source_channel: ent.source_channel || '',
      tags: ent.tags || [],
      
      // Settings
      country_code: c.settings?.country_code || 'IN',
      timezone: c.timezone || c.settings?.timezone || 'Asia/Kolkata',
      locale: c.settings?.locale || 'en-IN',
      date_format: c.settings?.date_format || 'DD/MM/YYYY',
      
      // Branding
      display_name: c.settings?.display_name || c.trade_name || '',
      theme_primary_color: c.settings?.theme_primary_color || '#6366f1',
      theme_secondary_color: c.settings?.theme_secondary_color || '#8b5cf6',
      
      // Registrations (Indian business registrations)
      registrations: {
        gstin: registrations.gstin || ent.tax_id || c.tax_id || '',
        pan: registrations.pan || '',
        tan: registrations.tan || '',
        cin: registrations.cin || '',
        llpin: registrations.llpin || '',
        udyam: registrations.udyam || '',
        iec: registrations.iec || c.import_export_code || '',
        fssai: registrations.fssai || '',
        drug_license: registrations.drug_license || '',
        shop_license: registrations.shop_license || '',
        trade_license: registrations.trade_license || '',
        professional_tax: registrations.professional_tax || '',
        pf_number: registrations.pf_number || '',
        esi_number: registrations.esi_number || '',
        other_registrations: registrations.other_registrations || [],
      },
      
      // Subscription
      subscription_plan: c.subscriptionPlan || 'starter',
      subscription_start: c.trial_start_date ? new Date(c.trial_start_date).toISOString().split('T')[0] : '',
      subscription_end: c.trial_end_date ? new Date(c.trial_end_date).toISOString().split('T')[0] : '',
      max_users: c.settings?.max_users || 5,
      storage_limit_gb: c.settings?.storage_limit_gb || 5,
      enabled_modules: c.modules_enabled || [],
      
      // Documents
      documents: ent.documents || c.documents || [],
      kyc_documents: ent.kyc_documents || [],
      
      // User access
      user_access: c.user_access || { username: '', role: 'Client', modules: [] },
      
      // Admin users - load from API response
      admin_users: (c.admin_users || []).map((u: any) => ({
        email: u.email || '',
        name: u.name || '',
        role: u.role || 'Admin',
        password: '', // Don't show existing password
        id: u.id,
      })),
      
      // Pass full settings for logo initialization
      settings: c.settings,
    };
  }

  const filtered = clients.filter((c: Client) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    const fields = [c.legal_name || c.name, c.client_code, c.client_type, c.tax_id];
    return fields.some((v) => (v || '').toLowerCase().includes(q));
  });

  return (
    <div className="w-full">
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
  );
}
