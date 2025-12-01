"use client";
import React, { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import API_BASE from '@/config/api';
import { RefreshCw, Upload, X, FileText, Building2, Globe, CreditCard, Users, Shield, Calendar } from 'lucide-react';

// International country data with phone codes and currency
const COUNTRIES = [
  { code: 'IN', name: 'India', phone: '+91', currency: 'INR', taxLabel: 'GSTIN', taxFormat: '22AAAAA0000A1Z5' },
  { code: 'US', name: 'United States', phone: '+1', currency: 'USD', taxLabel: 'EIN', taxFormat: '12-3456789' },
  { code: 'GB', name: 'United Kingdom', phone: '+44', currency: 'GBP', taxLabel: 'VAT', taxFormat: 'GB123456789' },
  { code: 'AE', name: 'UAE', phone: '+971', currency: 'AED', taxLabel: 'TRN', taxFormat: '100234567890003' },
  { code: 'SG', name: 'Singapore', phone: '+65', currency: 'SGD', taxLabel: 'UEN', taxFormat: '200000000A' },
  { code: 'AU', name: 'Australia', phone: '+61', currency: 'AUD', taxLabel: 'ABN', taxFormat: '12 345 678 901' },
  { code: 'DE', name: 'Germany', phone: '+49', currency: 'EUR', taxLabel: 'USt-IdNr', taxFormat: 'DE123456789' },
  { code: 'CA', name: 'Canada', phone: '+1', currency: 'CAD', taxLabel: 'BN', taxFormat: '123456789RC0001' },
  { code: 'JP', name: 'Japan', phone: '+81', currency: 'JPY', taxLabel: 'Corporate Number', taxFormat: '1234567890123' },
  { code: 'FR', name: 'France', phone: '+33', currency: 'EUR', taxLabel: 'SIRET', taxFormat: '12345678901234' },
];

const TIMEZONES = [
  'Asia/Kolkata', 'America/New_York', 'America/Los_Angeles', 'Europe/London', 
  'Europe/Paris', 'Asia/Dubai', 'Asia/Singapore', 'Asia/Tokyo', 'Australia/Sydney',
  'America/Toronto', 'Europe/Berlin', 'Asia/Hong_Kong'
];

const SUBSCRIPTION_PLANS = [
  { id: 'starter', name: 'Starter', price: 999, currency: 'INR', users: 5, modules: 3, storage: '5GB', support: 'Email' },
  { id: 'professional', name: 'Professional', price: 2999, currency: 'INR', users: 25, modules: 10, storage: '50GB', support: '24/7 Chat' },
  { id: 'enterprise', name: 'Enterprise', price: 9999, currency: 'INR', users: 'Unlimited', modules: 'All', storage: '500GB', support: 'Dedicated Manager' },
  { id: 'custom', name: 'Custom', price: 0, currency: 'INR', users: 'Custom', modules: 'Custom', storage: 'Custom', support: 'Custom' },
];

const BILLING_CYCLES = ['Monthly', 'Quarterly', 'Semi-Annual', 'Annual'];

export interface ClientFormValues {
  legal_name: string;
  trade_name: string;
  client_type: string;
  erp_registration_type?: string;
  tax_id: string;
  client_code: string;
  public_code?: string;
  type_sequence_code?: string;
  external_reference?: string;
  registration_number: string;
  business_size: string;
  industry: string;
  sales_representative: string;
  sales_team?: string[];
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
  segment?: string;
  tier?: string;
  lifecycle_stage?: string;
  source_channel?: string;
  tags?: string[];
  status: string;
  primary_address: { line1: string; line2: string; city: string; state: string; country: string; pincode: string };
  primary_contact: { name: string; role: string; phone: string; phone_code: string; email: string };
  secondary_contact: { name: string; role: string; phone: string; phone_code: string; email: string };
  kyc_documents?: any[];
  // International fields
  country_code: string;
  timezone: string;
  locale: string;
  date_format: string;
  // Subscription fields
  subscription_plan: string;
  subscription_start?: string;
  subscription_end?: string;
  trial_days?: number;
  max_users: number;
  enabled_modules: string[];
  storage_limit_gb: number;
  // Admin user
  admin_users: Array<{ email: string; name: string; role: string }>;
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
  primary_contact: { name: '', role: '', phone: '', phone_code: '+91', email: '' },
  secondary_contact: { name: '', role: '', phone: '', phone_code: '+91', email: '' },
  kyc_documents: [],
  // International
  country_code: 'IN',
  timezone: 'Asia/Kolkata',
  locale: 'en-IN',
  date_format: 'DD/MM/YYYY',
  // Subscription
  subscription_plan: 'starter',
  subscription_start: new Date().toISOString().split('T')[0],
  subscription_end: '',
  trial_days: 14,
  max_users: 5,
  enabled_modules: [],
  storage_limit_gb: 5,
  admin_users: [{ email: '', name: '', role: 'Admin' }],
};

export default function ClientForm({ initial, mode, clientId, onSuccess }: ClientFormProps) {
  const { user } = useAuth();
  const [form, setForm] = useState<ClientFormValues>({ ...defaultValues, ...(initial || {}) });
  const [creatingAdmin, setCreatingAdmin] = useState<boolean>(mode === 'create');
  const [adminUser, setAdminUser] = useState<{ email: string; username?: string; password?: string }>({ email: '' });
  const [loading, setLoading] = useState(false);
  const [registrationMode, setRegistrationMode] = useState<'quick' | 'permanent'>(mode === 'create' ? 'quick' : 'permanent');
  const [activeTab, setActiveTab] = useState<'basic' | 'international' | 'subscription' | 'documents' | 'users'>('basic');
  const [dragActive, setDragActive] = useState(false);
  const [uploadedDocs, setUploadedDocs] = useState<Array<{ name: string; type: string; size: number; category: string; file?: File }>>([]);

  // Get country info
  const selectedCountry = COUNTRIES.find(c => c.code === form.country_code) || COUNTRIES[0];
  const selectedPlan = SUBSCRIPTION_PLANS.find(p => p.id === form.subscription_plan) || SUBSCRIPTION_PLANS[0];

  // Handle country change - auto-update currency, phone code, tax label
  const handleCountryChange = (countryCode: string) => {
    const country = COUNTRIES.find(c => c.code === countryCode);
    if (country) {
      setForm({
        ...form,
        country_code: countryCode,
        currency: country.currency,
        primary_contact: { ...form.primary_contact, phone_code: country.phone },
        secondary_contact: { ...form.secondary_contact, phone_code: country.phone },
        primary_address: { ...form.primary_address, country: country.name },
      });
    }
  };

  // Handle plan change - auto-update limits
  const handlePlanChange = (planId: string) => {
    const plan = SUBSCRIPTION_PLANS.find(p => p.id === planId);
    if (plan) {
      setForm({
        ...form,
        subscription_plan: planId,
        max_users: typeof plan.users === 'number' ? plan.users : 999,
        storage_limit_gb: parseInt(plan.storage) || 500,
      });
    }
  };

  // Drag and drop handlers
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.length) {
      const newDocs = Array.from(e.dataTransfer.files).map(f => ({
        name: f.name, type: f.type, size: f.size, category: 'GENERAL', file: f
      }));
      setUploadedDocs([...uploadedDocs, ...newDocs]);
    }
  }, [uploadedDocs]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      const newDocs = Array.from(e.target.files).map(f => ({
        name: f.name, type: f.type, size: f.size, category: 'GENERAL', file: f
      }));
      setUploadedDocs([...uploadedDocs, ...newDocs]);
    }
  };

  const removeDoc = (idx: number) => {
    setUploadedDocs(uploadedDocs.filter((_, i) => i !== idx));
  };

  const updateDocCategory = (idx: number, category: string) => {
    const updated = [...uploadedDocs];
    updated[idx].category = category;
    setUploadedDocs(updated);
  };

  // Add admin user
  const addAdminUser = () => {
    setForm({
      ...form,
      admin_users: [...form.admin_users, { email: '', name: '', role: 'User' }]
    });
  };

  const removeAdminUser = (idx: number) => {
    setForm({
      ...form,
      admin_users: form.admin_users.filter((_, i) => i !== idx)
    });
  };

  const updateAdminUser = (idx: number, field: string, value: string) => {
    const updated = [...form.admin_users];
    (updated[idx] as any)[field] = value;
    setForm({ ...form, admin_users: updated });
  };

  async function submit() {
    if (!form.legal_name && !form.trade_name) {
      alert('Legal or Trade Name required');
      return;
    }
    // Quick mode: minimal requirements
    if (mode === 'create' && registrationMode === 'quick') {
      if (!form.admin_users[0]?.email) {
        alert('Admin email required to start a trial');
        return;
      }
    } else if (mode === 'create') {
      // Permanent: require full primary contact
      if (!form.primary_contact.name || !form.primary_contact.email || !form.primary_contact.phone) {
        alert('Primary contact details required');
        return;
      }
    }
    setLoading(true);
    try {
      const body: any = { ...form, name: form.legal_name || form.trade_name };
      // Include international settings
      body.settings = {
        country_code: form.country_code,
        timezone: form.timezone,
        locale: form.locale,
        date_format: form.date_format,
        currency: form.currency,
      };
      // Include subscription details
      body.subscription = {
        plan: form.subscription_plan,
        start_date: form.subscription_start,
        end_date: form.subscription_end,
        trial_days: form.trial_days,
        max_users: form.max_users,
        storage_limit_gb: form.storage_limit_gb,
        enabled_modules: form.enabled_modules,
      };
      // Include admin users to create
      body.admin_users = form.admin_users.filter(u => u.email);
      // Include uploaded documents metadata
      body.uploaded_documents = uploadedDocs.map(d => ({
        filename: d.name,
        content_type: d.type,
        size_bytes: d.size,
        category: d.category,
      }));
      // Flatten some meta that backend will store inside enterprise meta
      body.meta = {
        public_code: form.public_code || undefined,
        type_sequence_code: form.type_sequence_code || undefined,
        external_reference: form.external_reference || undefined,
        erp_registration_type: (mode === 'create' && registrationMode === 'quick') ? 'trial' : (form.erp_registration_type || undefined),
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
      // Quick mode always provisions an admin; Permanent follows the toggle
      const shouldProvision = (mode === 'create' && registrationMode === 'quick') ? true : creatingAdmin;
      if (shouldProvision && form.admin_users[0]?.email) {
        body.adminUser = form.admin_users[0];
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
      alert(mode === 'create' ? (registrationMode === 'quick' ? 'Trial started' : 'Client created') : 'Client updated');
    } catch (e: any) {
      console.error(e);
      alert(e.message || 'Failed');
    } finally {
      setLoading(false);
    }
  }

  // Tab navigation component
  const TabNav = () => (
    <div className="flex border-b mb-6 overflow-x-auto">
      {[
        { id: 'basic', label: 'Basic Info', icon: Building2 },
        { id: 'international', label: 'International', icon: Globe },
        { id: 'subscription', label: 'Subscription', icon: CreditCard },
        { id: 'documents', label: 'Documents', icon: FileText },
        { id: 'users', label: 'Users', icon: Users },
      ].map(tab => (
        <button
          key={tab.id}
          onClick={() => setActiveTab(tab.id as any)}
          className={`flex items-center gap-2 px-4 py-3 border-b-2 whitespace-nowrap transition-colors ${
            activeTab === tab.id 
              ? 'border-blue-600 text-blue-600' 
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <tab.icon className="w-4 h-4" />
          {tab.label}
        </button>
      ))}
    </div>
  );

  return (
    <div className="space-y-6 bg-white dark:bg-gray-900 p-6 rounded-lg">
      {/* Registration Mode Toggle (Create only) */}
      {mode === 'create' && (
        <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Registration Type:</span>
            <div className="inline-flex rounded-lg overflow-hidden border border-gray-300 dark:border-gray-600">
              <button type="button" onClick={() => setRegistrationMode('quick')} className={`px-4 py-2 text-sm font-medium ${registrationMode==='quick' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}>Quick Trial</button>
              <button type="button" onClick={() => setRegistrationMode('permanent')} className={`px-4 py-2 text-sm font-medium ${registrationMode==='permanent' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}>Full Registration</button>
            </div>
          </div>
          {registrationMode==='quick' && (
            <p className="text-xs text-gray-500 dark:text-gray-400">Quick creates a trial tenant with minimal details.</p>
          )}
        </div>
      )}

      {/* Tab Navigation */}
      {registrationMode === 'permanent' && <TabNav />}

      {/* TAB: Basic Info */}
      {(registrationMode === 'quick' || activeTab === 'basic') && (
        <div className="space-y-6">
          {/* Basic Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Legal Name *</label>
              <input value={form.legal_name} onChange={(e) => setForm({ ...form, legal_name: e.target.value })} className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 bg-white dark:bg-gray-800" placeholder="Company Legal Name" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Trade Name / Brand</label>
              <input value={form.trade_name} onChange={(e) => setForm({ ...form, trade_name: e.target.value })} className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 bg-white dark:bg-gray-800" placeholder="Display Name" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Entity Type</label>
              <select value={form.client_type} onChange={(e) => setForm({ ...form, client_type: e.target.value })} className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 bg-white dark:bg-gray-800">
                <option>Private Limited</option>
                <option>Public Limited</option>
                <option>LLP</option>
                <option>Partnership</option>
                <option>Proprietorship</option>
                <option>LLC</option>
                <option>Corporation</option>
                <option>Non-Profit</option>
                <option>Government</option>
                <option>Not Registered</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{selectedCountry.taxLabel} (Tax ID)</label>
              <input value={form.tax_id} onChange={(e) => setForm({ ...form, tax_id: e.target.value })} className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 bg-white dark:bg-gray-800" placeholder={selectedCountry.taxFormat} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Industry</label>
              <select value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 bg-white dark:bg-gray-800">
                <option value="">Select Industry</option>
                <option>Technology</option>
                <option>Healthcare</option>
                <option>Finance</option>
                <option>Manufacturing</option>
                <option>Retail</option>
                <option>Education</option>
                <option>Real Estate</option>
                <option>Transportation</option>
                <option>Energy</option>
                <option>Agriculture</option>
                <option>Hospitality</option>
                <option>Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Business Size</label>
              <select value={form.business_size} onChange={(e) => setForm({ ...form, business_size: e.target.value })} className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 bg-white dark:bg-gray-800">
                <option value="">Select Size</option>
                <option>1-10 employees</option>
                <option>11-50 employees</option>
                <option>51-200 employees</option>
                <option>201-500 employees</option>
                <option>501-1000 employees</option>
                <option>1000+ employees</option>
              </select>
            </div>
          </div>

          {/* Primary Address */}
          {registrationMode === 'permanent' && (
            <div className="border rounded-lg p-4 space-y-4">
              <h3 className="font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                <Building2 className="w-4 h-4" /> Primary Address
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input placeholder="Address Line 1" value={form.primary_address.line1} onChange={(e) => setForm({ ...form, primary_address: { ...form.primary_address, line1: e.target.value } })} className="border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 bg-white dark:bg-gray-800" />
                <input placeholder="Address Line 2" value={form.primary_address.line2} onChange={(e) => setForm({ ...form, primary_address: { ...form.primary_address, line2: e.target.value } })} className="border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 bg-white dark:bg-gray-800" />
                <input placeholder="City" value={form.primary_address.city} onChange={(e) => setForm({ ...form, primary_address: { ...form.primary_address, city: e.target.value } })} className="border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 bg-white dark:bg-gray-800" />
                <input placeholder="State / Province" value={form.primary_address.state} onChange={(e) => setForm({ ...form, primary_address: { ...form.primary_address, state: e.target.value } })} className="border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 bg-white dark:bg-gray-800" />
                <input placeholder="Country" value={form.primary_address.country} onChange={(e) => setForm({ ...form, primary_address: { ...form.primary_address, country: e.target.value } })} className="border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 bg-white dark:bg-gray-800" />
                <input placeholder="ZIP / Postal Code" value={form.primary_address.pincode} onChange={(e) => setForm({ ...form, primary_address: { ...form.primary_address, pincode: e.target.value } })} className="border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 bg-white dark:bg-gray-800" />
              </div>
            </div>
          )}

          {/* Primary Contact */}
          {registrationMode === 'permanent' && (
            <div className="border rounded-lg p-4 space-y-4">
              <h3 className="font-semibold text-gray-800 dark:text-gray-200">Primary Contact</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input placeholder="Contact Name *" value={form.primary_contact.name} onChange={(e) => setForm({ ...form, primary_contact: { ...form.primary_contact, name: e.target.value } })} className="border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 bg-white dark:bg-gray-800" />
                <input placeholder="Designation / Role" value={form.primary_contact.role} onChange={(e) => setForm({ ...form, primary_contact: { ...form.primary_contact, role: e.target.value } })} className="border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 bg-white dark:bg-gray-800" />
                <div className="flex gap-2">
                  <select value={form.primary_contact.phone_code} onChange={(e) => setForm({ ...form, primary_contact: { ...form.primary_contact, phone_code: e.target.value } })} className="w-24 border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 bg-white dark:bg-gray-800">
                    {COUNTRIES.map(c => <option key={c.code} value={c.phone}>{c.phone}</option>)}
                  </select>
                  <input placeholder="Phone Number *" value={form.primary_contact.phone} onChange={(e) => setForm({ ...form, primary_contact: { ...form.primary_contact, phone: e.target.value } })} className="flex-1 border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 bg-white dark:bg-gray-800" />
                </div>
                <input placeholder="Email Address *" type="email" value={form.primary_contact.email} onChange={(e) => setForm({ ...form, primary_contact: { ...form.primary_contact, email: e.target.value } })} className="border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 bg-white dark:bg-gray-800" />
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB: International Settings */}
      {registrationMode === 'permanent' && activeTab === 'international' && (
        <div className="space-y-6">
          <div className="border rounded-lg p-4 space-y-4">
            <h3 className="font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
              <Globe className="w-4 h-4" /> Regional Settings
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Country</label>
                <select value={form.country_code} onChange={(e) => handleCountryChange(e.target.value)} className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 bg-white dark:bg-gray-800">
                  {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Currency</label>
                <input value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 bg-white dark:bg-gray-800" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Timezone</label>
                <select value={form.timezone} onChange={(e) => setForm({ ...form, timezone: e.target.value })} className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 bg-white dark:bg-gray-800">
                  {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date Format</label>
                <select value={form.date_format} onChange={(e) => setForm({ ...form, date_format: e.target.value })} className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 bg-white dark:bg-gray-800">
                  <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                  <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                  <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Locale</label>
                <select value={form.locale} onChange={(e) => setForm({ ...form, locale: e.target.value })} className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 bg-white dark:bg-gray-800">
                  <option value="en-IN">English (India)</option>
                  <option value="en-US">English (US)</option>
                  <option value="en-GB">English (UK)</option>
                  <option value="de-DE">German</option>
                  <option value="fr-FR">French</option>
                  <option value="ja-JP">Japanese</option>
                  <option value="ar-AE">Arabic (UAE)</option>
                </select>
              </div>
            </div>
          </div>
          
          {/* Tax & Compliance Info */}
          <div className="border rounded-lg p-4 space-y-4">
            <h3 className="font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
              <Shield className="w-4 h-4" /> Tax & Compliance
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{selectedCountry.taxLabel}</label>
                <input value={form.tax_id} onChange={(e) => setForm({ ...form, tax_id: e.target.value })} placeholder={selectedCountry.taxFormat} className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 bg-white dark:bg-gray-800" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Registration Number</label>
                <input value={form.registration_number} onChange={(e) => setForm({ ...form, registration_number: e.target.value })} className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 bg-white dark:bg-gray-800" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">KYC Status</label>
                <select value={form.compliance.kyc_status} onChange={(e) => setForm({ ...form, compliance: { ...form.compliance, kyc_status: e.target.value } })} className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 bg-white dark:bg-gray-800">
                  <option>UNVERIFIED</option>
                  <option>PENDING</option>
                  <option>VERIFIED</option>
                  <option>REJECTED</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB: Subscription */}
      {registrationMode === 'permanent' && activeTab === 'subscription' && (
        <div className="space-y-6">
          {/* Plan Selection */}
          <div className="border rounded-lg p-4">
            <h3 className="font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2 mb-4">
              <CreditCard className="w-4 h-4" /> Select Subscription Plan
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {SUBSCRIPTION_PLANS.map(plan => (
                <div 
                  key={plan.id}
                  onClick={() => handlePlanChange(plan.id)}
                  className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                    form.subscription_plan === plan.id 
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                  }`}
                >
                  <h4 className="font-semibold text-lg">{plan.name}</h4>
                  {plan.price > 0 ? (
                    <p className="text-2xl font-bold text-blue-600">₹{plan.price}<span className="text-sm font-normal text-gray-500">/mo</span></p>
                  ) : (
                    <p className="text-2xl font-bold text-blue-600">Contact Us</p>
                  )}
                  <ul className="mt-3 space-y-1 text-sm text-gray-600 dark:text-gray-400">
                    <li>👥 {plan.users} users</li>
                    <li>📦 {plan.modules} modules</li>
                    <li>💾 {plan.storage} storage</li>
                    <li>🎧 {plan.support}</li>
                  </ul>
                </div>
              ))}
            </div>
          </div>

          {/* Billing Details */}
          <div className="border rounded-lg p-4 space-y-4">
            <h3 className="font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
              <Calendar className="w-4 h-4" /> Billing Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Billing Cycle</label>
                <select value={form.billing_cycle} onChange={(e) => setForm({ ...form, billing_cycle: e.target.value })} className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 bg-white dark:bg-gray-800">
                  {BILLING_CYCLES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Start Date</label>
                <input type="date" value={form.subscription_start} onChange={(e) => setForm({ ...form, subscription_start: e.target.value })} className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 bg-white dark:bg-gray-800" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Trial Days</label>
                <input type="number" value={form.trial_days} onChange={(e) => setForm({ ...form, trial_days: parseInt(e.target.value) || 0 })} className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 bg-white dark:bg-gray-800" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Max Users</label>
                <input type="number" value={form.max_users} onChange={(e) => setForm({ ...form, max_users: parseInt(e.target.value) || 1 })} className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 bg-white dark:bg-gray-800" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Storage Limit (GB)</label>
                <input type="number" value={form.storage_limit_gb} onChange={(e) => setForm({ ...form, storage_limit_gb: parseInt(e.target.value) || 1 })} className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 bg-white dark:bg-gray-800" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Payment Terms</label>
                <select value={form.payment_terms} onChange={(e) => setForm({ ...form, payment_terms: e.target.value })} className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 bg-white dark:bg-gray-800">
                  <option>Due on Receipt</option>
                  <option>Net 15</option>
                  <option>Net 30</option>
                  <option>Net 45</option>
                  <option>Net 60</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB: Documents */}
      {registrationMode === 'permanent' && activeTab === 'documents' && (
        <div className="space-y-6">
          <div className="border rounded-lg p-4">
            <h3 className="font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2 mb-4">
              <FileText className="w-4 h-4" /> Upload Documents
            </h3>
            
            {/* Drag & Drop Zone */}
            <div 
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragActive ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-300 dark:border-gray-600'
              }`}
            >
              <Upload className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600 dark:text-gray-400 mb-2">Drag & drop files here, or click to browse</p>
              <input type="file" multiple onChange={handleFileSelect} className="hidden" id="file-upload" />
              <label htmlFor="file-upload" className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg cursor-pointer hover:bg-blue-700">
                <Upload className="w-4 h-4 mr-2" /> Select Files
              </label>
              <p className="text-xs text-gray-500 mt-2">Supported: PDF, JPG, PNG, DOC, DOCX (Max 10MB each)</p>
            </div>

            {/* Document Categories */}
            <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Document Categories:</p>
              <div className="flex flex-wrap gap-2">
                {['Registration Certificate', 'Tax Document', 'ID Proof', 'Address Proof', 'Bank Details', 'Contract', 'License', 'Other'].map(cat => (
                  <span key={cat} className="px-2 py-1 bg-white dark:bg-gray-700 border rounded text-xs">{cat}</span>
                ))}
              </div>
            </div>

            {/* Uploaded Files List */}
            {uploadedDocs.length > 0 && (
              <div className="mt-4 space-y-2">
                <h4 className="font-medium text-gray-700 dark:text-gray-300">Uploaded Files ({uploadedDocs.length})</h4>
                {uploadedDocs.map((doc, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-blue-600" />
                      <div>
                        <p className="font-medium text-sm">{doc.name}</p>
                        <p className="text-xs text-gray-500">{(doc.size / 1024).toFixed(1)} KB</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <select value={doc.category} onChange={(e) => updateDocCategory(idx, e.target.value)} className="text-sm border rounded p-1">
                        <option value="GENERAL">General</option>
                        <option value="REGISTRATION">Registration</option>
                        <option value="TAX">Tax Document</option>
                        <option value="ID_PROOF">ID Proof</option>
                        <option value="ADDRESS_PROOF">Address Proof</option>
                        <option value="BANK">Bank Details</option>
                        <option value="CONTRACT">Contract</option>
                        <option value="LICENSE">License</option>
                      </select>
                      <button onClick={() => removeDoc(idx)} className="p-1 text-red-500 hover:bg-red-50 rounded">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB: Users */}
      {(registrationMode === 'quick' || activeTab === 'users') && (
        <div className="space-y-6">
          <div className="border rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                <Users className="w-4 h-4" /> Admin Users
              </h3>
              {registrationMode === 'permanent' && (
                <button onClick={addAdminUser} className="text-sm text-blue-600 hover:underline">+ Add User</button>
              )}
            </div>
            <p className="text-sm text-gray-500 mb-4">
              {registrationMode === 'quick' 
                ? 'Enter the primary admin email to provision the client account.' 
                : 'Add admin users who will manage this client account.'}
            </p>
            
            {form.admin_users.map((adminU, idx) => (
              <div key={idx} className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email *</label>
                  <input 
                    type="email" 
                    placeholder="admin@company.com" 
                    value={adminU.email} 
                    onChange={(e) => updateAdminUser(idx, 'email', e.target.value)} 
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 bg-white dark:bg-gray-700" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
                  <input 
                    placeholder="Full Name" 
                    value={adminU.name} 
                    onChange={(e) => updateAdminUser(idx, 'name', e.target.value)} 
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 bg-white dark:bg-gray-700" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Role</label>
                  <select 
                    value={adminU.role} 
                    onChange={(e) => updateAdminUser(idx, 'role', e.target.value)} 
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 bg-white dark:bg-gray-700"
                  >
                    <option>Admin</option>
                    <option>Manager</option>
                    <option>User</option>
                  </select>
                </div>
                {idx > 0 && registrationMode === 'permanent' && (
                  <div className="flex items-end">
                    <button onClick={() => removeAdminUser(idx)} className="px-3 py-2 text-red-600 border border-red-300 rounded-lg hover:bg-red-50">Remove</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Submit Button */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <button onClick={submit} disabled={loading} className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium flex items-center hover:bg-blue-700 disabled:opacity-50">
          {loading && <RefreshCw className="w-4 h-4 mr-2 animate-spin" />} 
          {mode === 'create' ? (registrationMode === 'quick' ? 'Start Trial' : 'Create Client') : 'Update Client'}
        </button>
      </div>
    </div>
  );
}
