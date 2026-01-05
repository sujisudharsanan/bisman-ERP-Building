"use client";
import React, { useEffect, useState } from 'react';
// Note: Layout is provided by /app/system/layout.tsx
import ClientForm, { ClientFormValues } from '@/components/clients/ClientForm';
import { useParams } from 'next/navigation';
import API_BASE from '@/config/api';
import Link from 'next/link';
import ClientDocuments from '@/components/clients/ClientDocuments';

export default function EditClientPage() {
  const params = useParams();
  const id = (params as any)?.id as string;
  const [initial, setInitial] = useState<Partial<ClientFormValues> | null>(null);
  const [rawData, setRawData] = useState<any>(null); // Store raw data for logo
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`${API_BASE}/api/system/clients/${encodeURIComponent(id)}`, { credentials: 'include' });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Failed to fetch client');
        const c = json.data;
        
        // Store raw data for components that need it (like logo)
        setRawData(c);
        
        // Extract enterprise settings (where most detailed data is stored)
        const ent = c.settings?.enterprise || {};
        const addresses = ent.addresses || c.addresses || [];
        const contacts = ent.contacts || c.contact_persons || [];
        const primaryAddr = addresses.find((a: any) => a.type === 'registered' || a.primary) || addresses[0] || {};
        const secondaryAddrs = addresses.filter((a: any) => a !== primaryAddr);
        const primaryContact = contacts.find((ct: any) => ct.primary) || contacts[0] || {};
        const secondaryContact = contacts.find((ct: any) => !ct.primary) || contacts[1] || {};
        
        // Extract registrations from enterprise settings
        const registrations = ent.registrations || {};
        
        // Map all fields from backend to form
        setInitial({
          // Basic Info
          legal_name: ent.legal_name || c.legal_name || c.name || '',
          trade_name: ent.trade_name || c.trade_name || '',
          client_type: ent.client_type || c.client_type || 'Not Registered',
          erp_registration_type: ent.meta?.erp_registration_type || c.settings?.meta?.erp_registration_type || 'registered',
          tax_id: ent.tax_id || c.tax_id || '',
          client_code: ent.client_code || c.client_code || '',
          public_code: ent.public_code || c.public_code || '',
          type_sequence_code: ent.type_sequence_code || '',
          external_reference: ent.external_reference || '',
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
          preferred_payment_method: ent.preferred_payment_method || '',
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
          sales_representative: ent.sales_representative || '',
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
          trial_days: 14,
          max_users: c.settings?.max_users || 5,
          storage_limit_gb: c.settings?.storage_limit_gb || 5,
          enabled_modules: c.modules_enabled || [],
          
          // Documents
          documents: ent.documents || c.documents || [],
          kyc_documents: ent.kyc_documents || [],
          
          // Admin users (empty for edit - users managed separately)
          admin_users: [],
          
          // Pass full settings for logo initialization
          settings: c.settings,
        } as Partial<ClientFormValues>);
      } catch (e: any) {
        console.error(e);
        alert(e.message || 'Failed to load client');
      } finally {
        setLoading(false);
      }
    }
    if (id) load();
  }, [id]);

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Edit Client: {initial?.legal_name || initial?.trade_name || 'Loading...'}</h1>
          <p className="text-gray-500">Modify enterprise client details</p>
        </div>
        <Link href="/system/user-management" className="text-sm text-blue-600 hover:underline">← Back to Client List</Link>
      </div>
      {loading && <p className="text-sm text-gray-500">Loading client data...</p>}
      {!loading && initial && (
        <>
          <ClientForm mode="edit" clientId={id} initial={initial} onSuccess={() => { alert('Client updated successfully!'); }} />
          <ClientDocuments clientId={id} />
        </>
      )}
    </div>
  );
}
