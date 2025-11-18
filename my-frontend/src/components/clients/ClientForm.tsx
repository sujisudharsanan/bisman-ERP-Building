"use client";
import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import API_BASE from '@/config/api';
import { RefreshCw } from 'lucide-react';

export interface ClientFormValues {
  legal_name: string;
  trade_name: string;
  // Client Type now means legal entity type (e.g., Pvt Ltd, Partnership, Proprietorship, Not Registered)
  client_type: string;
  // ERP Registration type within our system (trial, temporary, registered)
  erp_registration_type?: string;
  tax_id: string;
  client_code: string;
  public_code?: string; // human friendly generated code (meta)
  type_sequence_code?: string; // per type sequence
  external_reference?: string; // optional external system ref
  registration_number: string;
  business_size: string;
  industry: string;
  sales_representative: string; // primary sales owner
  sales_team?: string[]; // additional sales reps
  currency: string;
  payment_terms: string;
  credit_limit: string;
  billing_cycle: string;
  preferred_payment_method: string;
  bank_details: { account_name: string; bank_name: string; branch: string; account_number: string; swift: string; ifsc: string; iban: string };
  documents: any[];
  user_access: { username: string; role: string; modules: string[] };
  operational: { service_area: string; category: string; preferred_delivery: string; sla: string };
  compliance: { risk_category: string; aml_status: string; verification_date: string; approved_by: string; blacklist: boolean; kyc_status?: string; risk_score?: number };
  segment?: string; // e.g. Enterprise/SMB/Individual
  tier?: string; // e.g. Gold/Silver/Bronze
  lifecycle_stage?: string; // trial, active, suspended, churned
  source_channel?: string; // referral, inbound, outbound
  tags?: string[];
  status: string;
  primary_address: { line1: string; line2: string; city: string; state: string; country: string; pincode: string };
  primary_contact: { name: string; role: string; phone: string; email: string };
  secondary_contact: { name: string; role: string; phone: string; email: string };
  kyc_documents?: any[]; // uploaded KYC docs meta
}

export interface ClientFormProps {
  initial?: Partial<ClientFormValues>;
  mode: 'create' | 'edit';
  clientId?: string;
  onSuccess?: (data: any) => void;
}

const defaultValues: ClientFormValues = {
  legal_name: '',
  trade_name: '',
  // Default legal entity type
  client_type: 'Not Registered',
  erp_registration_type: 'registered',
  tax_id: '',
  client_code: '',
  public_code: '',
  type_sequence_code: '',
  external_reference: '',
  registration_number: '',
  business_size: '',
  industry: '',
  sales_representative: '',
  sales_team: [],
  currency: 'INR',
  payment_terms: 'Net 30',
  credit_limit: '',
  billing_cycle: 'Monthly',
  preferred_payment_method: '',
  bank_details: { account_name: '', bank_name: '', branch: '', account_number: '', swift: '', ifsc: '', iban: '' },
  documents: [],
  user_access: { username: '', role: 'Client', modules: [] },
  operational: { service_area: '', category: '', preferred_delivery: '', sla: '' },
  compliance: { risk_category: 'Low', aml_status: 'Pending', verification_date: '', approved_by: '', blacklist: false, kyc_status: 'UNVERIFIED', risk_score: 0 },
  segment: 'SMB',
  tier: 'Bronze',
  lifecycle_stage: 'trial',
  source_channel: '',
  tags: [],
  status: 'Active',
  primary_address: { line1: '', line2: '', city: '', state: '', country: '', pincode: '' },
  primary_contact: { name: '', role: '', phone: '', email: '' },
  secondary_contact: { name: '', role: '', phone: '', email: '' },
  kyc_documents: [],
};

export default function ClientForm({ initial, mode, clientId, onSuccess }: ClientFormProps) {
  const { user } = useAuth();
  const [form, setForm] = useState<ClientFormValues>({ ...defaultValues, ...(initial || {}) });
  const [creatingAdmin, setCreatingAdmin] = useState<boolean>(mode === 'create');
  const [adminUser, setAdminUser] = useState<{ email: string; username?: string; password?: string }>({ email: '' });
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!form.legal_name && !form.trade_name) {
      alert('Legal or Trade Name required');
      return;
    }
    if (mode === 'create' && (!form.primary_contact.name || !form.primary_contact.email || !form.primary_contact.phone)) {
      alert('Primary contact details required');
      return;
    }
    setLoading(true);
    try {
      const body: any = { ...form, name: form.legal_name || form.trade_name };
      // Flatten some meta that backend will store inside enterprise meta
      body.meta = {
        public_code: form.public_code || undefined,
        type_sequence_code: form.type_sequence_code || undefined,
        external_reference: form.external_reference || undefined,
  erp_registration_type: form.erp_registration_type || undefined,
        segment: form.segment,
        tier: form.tier,
        lifecycle_stage: form.lifecycle_stage,
        source_channel: form.source_channel,
        tags: form.tags,
        sales_team: form.sales_team,
        kyc_status: form.compliance.kyc_status,
        risk_score: form.compliance.risk_score,
        kyc_documents: form.kyc_documents,
      };
      const sid = (user as any)?.super_admin_id ?? (user as any)?.superAdminId ?? (((user as any)?.role === 'SUPER_ADMIN' || (user as any)?.roleName === 'SUPER_ADMIN') ? (user as any)?.id : undefined);
      if (sid) body.super_admin_id = sid;
      if (creatingAdmin && adminUser.email) {
        body.adminUser = adminUser;
        body.ensurePermissions = true;
        body.defaultViewAll = true;
      }
      let url = `${API_BASE}/api/system/clients`;
      let method = 'POST';
      if (mode === 'edit' && clientId) {
        url = `${API_BASE}/api/system/clients/${encodeURIComponent(clientId)}`;
        method = 'PATCH';
      }
      const res = await fetch(url, { method, credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Request failed');
      if (onSuccess) onSuccess(json);
      alert(mode === 'create' ? 'Client created' : 'Client updated');
    } catch (e: any) {
      console.error(e);
      alert(e.message || 'Failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Identification Section */}
      <div className="border rounded p-4 space-y-4 bg-gray-50">
  <h3 className="font-semibold">Identification</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm text-gray-600">Public Code</label>
            <input value={form.public_code} onChange={(e) => setForm({ ...form, public_code: e.target.value })} className="w-full border rounded p-2" placeholder="Auto or manual" />
          </div>
          <div>
            <label className="block text-sm text-gray-600">Type Sequence Code</label>
            <input value={form.type_sequence_code} onChange={(e) => setForm({ ...form, type_sequence_code: e.target.value })} className="w-full border rounded p-2" placeholder="e.g. COM-2025-0012" />
          </div>
          <div>
            <label className="block text-sm text-gray-600">External Reference</label>
            <input value={form.external_reference} onChange={(e) => setForm({ ...form, external_reference: e.target.value })} className="w-full border rounded p-2" placeholder="CRM/Legacy ID" />
          </div>
        </div>
      </div>

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
          <label className="block text-sm text-gray-600">Entity Type (Company Registration)</label>
          <select value={form.client_type} onChange={(e) => setForm({ ...form, client_type: e.target.value })} className="w-full border rounded p-2">
            <option>Private Limited</option>
            <option>Partnership</option>
            <option>Proprietorship</option>
            <option>Not Registered</option>
          </select>
        </div>
        <div>
          <label className="block text-sm text-gray-600">Tax ID (GSTIN/VAT/PAN)</label>
          <input value={form.tax_id} onChange={(e) => setForm({ ...form, tax_id: e.target.value })} className="w-full border rounded p-2" />
        </div>
      </div>

      {/* ERP Registration Type */}
      <div className="border rounded p-4 space-y-4">
        <h3 className="font-semibold">ERP Registration</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm text-gray-600">Registration Type</label>
            <select value={form.erp_registration_type} onChange={(e) => setForm({ ...form, erp_registration_type: e.target.value })} className="w-full border rounded p-2">
              <option value="trial">Trial</option>
              <option value="temporary">Temporary</option>
              <option value="registered">Registered</option>
            </select>
          </div>
        </div>
      </div>

      <div>
  <h3 className="font-semibold mb-2">Primary Address</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input placeholder="Line 1" value={form.primary_address.line1} onChange={(e) => setForm({ ...form, primary_address: { ...form.primary_address, line1: e.target.value } })} className="border rounded p-2" />
          <input placeholder="Line 2" value={form.primary_address.line2} onChange={(e) => setForm({ ...form, primary_address: { ...form.primary_address, line2: e.target.value } })} className="border rounded p-2" />
          <input placeholder="City" value={form.primary_address.city} onChange={(e) => setForm({ ...form, primary_address: { ...form.primary_address, city: e.target.value } })} className="border rounded p-2" />
          <input placeholder="State" value={form.primary_address.state} onChange={(e) => setForm({ ...form, primary_address: { ...form.primary_address, state: e.target.value } })} className="border rounded p-2" />
          <input placeholder="Country" value={form.primary_address.country} onChange={(e) => setForm({ ...form, primary_address: { ...form.primary_address, country: e.target.value } })} className="border rounded p-2" />
          <input placeholder="PIN/ZIP" value={form.primary_address.pincode} onChange={(e) => setForm({ ...form, primary_address: { ...form.primary_address, pincode: e.target.value } })} className="border rounded p-2" />
        </div>
      </div>

      {/* Lifecycle & Segmentation */}
      <div className="border rounded p-4 space-y-4 bg-gray-50">
        <h3 className="font-semibold">Lifecycle & Segmentation</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm text-gray-600">Lifecycle Stage</label>
            <select value={form.lifecycle_stage} onChange={(e) => setForm({ ...form, lifecycle_stage: e.target.value })} className="w-full border rounded p-2">
              <option>trial</option>
              <option>active</option>
              <option>suspended</option>
              <option>churned</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-600">Segment</label>
            <select value={form.segment} onChange={(e) => setForm({ ...form, segment: e.target.value })} className="w-full border rounded p-2">
              <option>Enterprise</option>
              <option>SMB</option>
              <option>Individual</option>
              <option>Franchise</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-600">Tier</label>
            <select value={form.tier} onChange={(e) => setForm({ ...form, tier: e.target.value })} className="w-full border rounded p-2">
              <option>Bronze</option>
              <option>Silver</option>
              <option>Gold</option>
              <option>Platinum</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-600">Source Channel</label>
            <input value={form.source_channel} onChange={(e) => setForm({ ...form, source_channel: e.target.value })} className="w-full border rounded p-2" placeholder="referral/outbound" />
          </div>
        </div>
      </div>

      {/* Sales Assignment */}
      <div className="border rounded p-4 space-y-4">
        <h3 className="font-semibold">Sales Assignment</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm text-gray-600">Primary Sales Rep</label>
            <input value={form.sales_representative} onChange={(e) => setForm({ ...form, sales_representative: e.target.value })} className="w-full border rounded p-2" />
          </div>
          <div>
            <label className="block text-sm text-gray-600">Add Sales Team Member</label>
            <input onKeyDown={(e) => { if (e.key === 'Enter' && e.currentTarget.value.trim()) { setForm({ ...form, sales_team: [...(form.sales_team||[]), e.currentTarget.value.trim()] }); e.currentTarget.value=''; } }} placeholder="Press Enter to add" className="w-full border rounded p-2" />
          </div>
          <div className="space-y-1">
            <label className="block text-sm text-gray-600">Team Members</label>
            <div className="flex flex-wrap gap-1">
              {(form.sales_team||[]).map((m,i) => (
                <span key={i} className="px-2 py-1 bg-indigo-600 text-white text-xs rounded cursor-pointer" onClick={() => setForm({ ...form, sales_team: form.sales_team!.filter(x=>x!==m) })}>{m} ×</span>
              ))}
              {(form.sales_team||[]).length===0 && <span className="text-xs text-gray-500">None</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Compliance & Risk */}
      <div className="border rounded p-4 space-y-4 bg-gray-50">
        <h3 className="font-semibold">Compliance & Risk</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm text-gray-600">KYC Status</label>
            <select value={form.compliance.kyc_status} onChange={(e)=> setForm({ ...form, compliance:{ ...form.compliance, kyc_status: e.target.value }})} className="w-full border rounded p-2">
              <option>UNVERIFIED</option>
              <option>PENDING</option>
              <option>VERIFIED</option>
              <option>REJECTED</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-600">Risk Category</label>
            <select value={form.compliance.risk_category} onChange={(e)=> setForm({ ...form, compliance:{ ...form.compliance, risk_category: e.target.value }})} className="w-full border rounded p-2">
              <option>Low</option>
              <option>Medium</option>
              <option>High</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-600">AML Status</label>
            <select value={form.compliance.aml_status} onChange={(e)=> setForm({ ...form, compliance:{ ...form.compliance, aml_status: e.target.value }})} className="w-full border rounded p-2">
              <option>Pending</option>
              <option>Clear</option>
              <option>Review</option>
              <option>Escalated</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-600">Risk Score (0-100)</label>
            <input type="number" min={0} max={100} value={form.compliance.risk_score} onChange={(e)=> setForm({ ...form, compliance:{ ...form.compliance, risk_score: parseInt(e.target.value||'0',10) }})} className="w-full border rounded p-2" />
          </div>
        </div>
      </div>

      {/* KYC Documents */}
      <div className="border rounded p-4 space-y-4">
        <h3 className="font-semibold">KYC Documents</h3>
        <p className="text-xs text-gray-500">Upload identity, address proof, registration certificates. Select type KYC in document uploader.</p>
        {/* Lazy import avoidance: we assume ClientDocuments globally available path */}
        {/* Using dynamic require to avoid Next SSR mismatch if needed */}
        {React.createElement(require('./ClientDocuments')?.default || (()=> <div className="text-xs text-red-600">Document component missing</div>), { clientId: clientId || 'new-temp', onAdded: (doc:any)=> setForm({ ...form, kyc_documents: [...(form.kyc_documents||[]), doc] }) })}
      </div>

      <div>
        <h3 className="font-semibold mb-2">Primary Contact</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input placeholder="Name" value={form.primary_contact.name} onChange={(e) => setForm({ ...form, primary_contact: { ...form.primary_contact, name: e.target.value } })} className="border rounded p-2" />
          <input placeholder="Role" value={form.primary_contact.role} onChange={(e) => setForm({ ...form, primary_contact: { ...form.primary_contact, role: e.target.value } })} className="border rounded p-2" />
          <input placeholder="Phone" value={form.primary_contact.phone} onChange={(e) => setForm({ ...form, primary_contact: { ...form.primary_contact, phone: e.target.value } })} className="border rounded p-2" />
          <input placeholder="Email" value={form.primary_contact.email} onChange={(e) => setForm({ ...form, primary_contact: { ...form.primary_contact, email: e.target.value } })} className="border rounded p-2" />
        </div>
      </div>

      {mode === 'create' && (
        <div className="space-y-2">
          <label className="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" checked={creatingAdmin} onChange={(e) => setCreatingAdmin(e.target.checked)} /> Provision Admin Now
          </label>
          {creatingAdmin && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <input placeholder="Admin Email" value={adminUser.email} onChange={(e) => setAdminUser({ ...adminUser, email: e.target.value })} className="border rounded p-2" />
              <input placeholder="Username (optional)" value={adminUser.username || ''} onChange={(e) => setAdminUser({ ...adminUser, username: e.target.value })} className="border rounded p-2" />
              <input placeholder="Password (optional)" type="password" value={adminUser.password || ''} onChange={(e) => setAdminUser({ ...adminUser, password: e.target.value })} className="border rounded p-2" />
            </div>
          )}
        </div>
      )}

      <div className="flex justify-end gap-2">
        <button onClick={submit} disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded text-sm flex items-center">
          {loading && <RefreshCw className="w-4 h-4 mr-2 animate-spin" />} {mode === 'create' ? 'Save Client' : 'Update Client'}
        </button>
      </div>
    </div>
  );
}
