"use client";
import React, { useEffect, useState } from 'react';
import SuperAdminShell from '@/components/layouts/SuperAdminShell';
import ClientForm, { ClientFormValues } from '@/components/clients/ClientForm';
import { useParams } from 'next/navigation';
import API_BASE from '@/config/api';
import Link from 'next/link';
import ClientDocuments from '@/components/clients/ClientDocuments';

export default function EditClientPage() {
  const params = useParams();
  const id = (params as any)?.id as string;
  const [initial, setInitial] = useState<Partial<ClientFormValues> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`${API_BASE}/api/system/clients/${encodeURIComponent(id)}`, { credentials: 'include' });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Failed to fetch client');
        const c = json.data;
        setInitial({
          legal_name: c.legal_name || c.name || '',
          trade_name: c.trade_name || '',
          client_type: c.client_type || 'Company',
          tax_id: c.tax_id || '',
          client_code: c.client_code || '',
          registration_number: c.registration_number || '',
          business_size: c.business_size || '',
          industry: c.industry || '',
          primary_address: c.primary_address || { line1: '', line2: '', city: '', state: '', country: '', pincode: '' },
          primary_contact: c.primary_contact || { name: '', role: '', phone: '', email: '' },
          secondary_contact: c.secondary_contact || { name: '', role: '', phone: '', email: '' },
          status: c.status || 'Active'
        });
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
    <SuperAdminShell>
      <div className="p-4 md:p-6 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold">Edit Client</h1>
            <p className="text-gray-500">Modify enterprise client details</p>
          </div>
          <Link href="/system/user-management" className="text-sm text-blue-600">Back to Client List</Link>
        </div>
        {loading && <p className="text-sm text-gray-500">Loading...</p>}
        {!loading && initial && (
          <>
            <ClientForm mode="edit" clientId={id} initial={initial} onSuccess={() => { alert('Updated'); }} />
            <ClientDocuments clientId={id} />
          </>
        )}
      </div>
    </SuperAdminShell>
  );
}
