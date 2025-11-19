"use client";
import React, { useState, useEffect, useCallback } from 'react';
import RequirePlatformOrTenantAdmin from '@/components/auth/RequirePlatformOrTenantAdmin';
import API_BASE from '@/config/api';
import Stepper from '@/components/onboarding/Stepper';
import ProgressBar from '@/components/onboarding/ProgressBar';
import FormField from '@/components/onboarding/FormField';
import SaveDraftButton from '@/components/onboarding/SaveDraftButton';
import { RegisteredClientWizardState } from '@/types/onboarding';
import { validateRegisteredStep } from '@/lib/validation/onboarding';

const STEPS: Array<keyof RegisteredClientWizardState> = ['identification','registration','lifecycle','sales','compliance','primary_contact','notifications','legal'];

function initialState(): RegisteredClientWizardState {
  return {
    identification: { legal_name: '', trade_name: '', organization_type: 'LLC', tax_id: '' },
    registration: { registration_type: 'New Implementation', primary_address: { line1:'', city:'', country:'', state:'', pincode:'' }, billing_address: { line1:'', city:'', country:'', state:'', pincode:'' }, preferred_currency: 'USD' },
    lifecycle: { lifecycle_stage: 'Lead', segment: 'SMB', tier: 'C', source_channel: 'Web' },
    sales: { sales_team: [] },
    compliance: { kyc_status: 'Pending', risk_category: 'Low', risk_score: 0 },
    primary_contact: { admin_name: '', admin_email: '', admin_mobile: '' },
    notifications: { channels: { email: true, sms: false, whatsapp: false }, daily_summary: false, approvals_alerts: true },
    legal: { terms_of_service: false },
  };
}

export default function RegisteredClientWizardPage() {
  const [state, setState] = useState<RegisteredClientWizardState>(initialState());
  const [currentIndex, setCurrentIndex] = useState(0);
  const [errors, setErrors] = useState<Record<string,string>>({});
  const [draftId, setDraftId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const currentKey = STEPS[currentIndex];

  // Autosave (debounced)
  const autosave = useCallback(() => {
    if (!draftId) return; // only after first manual draft save
    const controller = new AbortController();
    const payload = { draft_client_id: draftId, save_as_draft: true, state }; // route to be implemented later
    fetch(`${API_BASE}/api/system/clients`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload), signal: controller.signal }).catch(()=>{});
    return () => controller.abort();
  }, [draftId, state]);

  useEffect(() => {
    const t = setTimeout(() => autosave(), 1500);
    return () => clearTimeout(t);
  }, [autosave]);

  function update<K extends keyof RegisteredClientWizardState>(section: K, value: RegisteredClientWizardState[K]) { setState(prev => ({ ...prev, [section]: value })); }

  function next() {
    const v = validateRegisteredStep(state, currentKey);
    if (!v.valid) { setErrors(v.errors); return; }
    setErrors({});
    setCurrentIndex(i => Math.min(STEPS.length-1, i+1));
  }
  function back() { setCurrentIndex(i => Math.max(0, i-1)); }

  async function saveDraft() {
    setSaving(true);
    try {
      const payload = { name: state.identification.legal_name || state.identification.trade_name || 'Draft', legal_name: state.identification.legal_name, trade_name: state.identification.trade_name, client_type: state.identification.organization_type, tax_id: state.identification.tax_id, saveAsDraft: true };
      const res = await fetch(`${API_BASE}/api/system/clients`, { method:'POST', headers:{'Content-Type':'application/json'}, credentials:'include', body: JSON.stringify(payload) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'draft_failed');
      setDraftId(json.data?.id || json.data?.client_id || json.client_id || null);
      alert('Draft saved');
    } catch (e:any) {
      alert(e.message);
    } finally { setSaving(false); }
  }

  async function finalize() {
    const v = validateRegisteredStep(state, currentKey);
    if (!v.valid) { setErrors(v.errors); return; }
    setSaving(true);
    try {
      const payload: any = {
        name: state.identification.legal_name || state.identification.trade_name,
        legal_name: state.identification.legal_name,
        trade_name: state.identification.trade_name,
        client_type: state.identification.organization_type,
        tax_id: state.identification.tax_id,
        // lifecycle / segmentation
        segment: state.lifecycle.segment,
        tier: state.lifecycle.tier,
        lifecycle_stage: state.lifecycle.lifecycle_stage.toLowerCase(),
        source_channel: state.lifecycle.source_channel,
        // primary address
        primary_address: state.registration.primary_address,
        // sales
        sales_team: state.sales.sales_team,
        // compliance
        kyc_status: state.compliance.kyc_status,
        risk_score: state.compliance.risk_score,
        // contact
        primary_contact: { name: state.primary_contact.admin_name, email: state.primary_contact.admin_email, phone: state.primary_contact.admin_mobile, role: 'Admin' },
        // notifications meta
        meta: { notifications: state.notifications, onboarding: { wizard_completed: true } },
      };
      const res = await fetch(`${API_BASE}/api/system/clients`, { method:'POST', headers:{'Content-Type':'application/json'}, credentials:'include', body: JSON.stringify(payload) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'create_failed');
      alert('Client registered');
    } catch (e:any) {
      alert(e.message);
    } finally { setSaving(false); }
  }

  return (
    <RequirePlatformOrTenantAdmin>
    <main className="min-h-screen bg-gray-50 p-4 flex flex-col items-center">
      <div className="w-full max-w-4xl bg-white shadow rounded p-6 space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-semibold">Enterprise Client Onboarding</h1>
            <p className="text-sm text-gray-500">Step-by-step wizard. Autosaves drafts.</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Stepper steps={STEPS.map(s=>s.replace('_',' '))} current={currentIndex+1} />
            <ProgressBar percent={((currentIndex+1)/STEPS.length)*100} />
          </div>
        </div>

        {/* Identification */}
        {currentKey === 'identification' && (
          <section className="space-y-4" aria-labelledby="identification">
            <h2 id="identification" className="font-medium">Identification</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <FormField label="Legal Name" required error={errors.legal_name}><input value={state.identification.legal_name} onChange={e=>update('identification',{...state.identification, legal_name:e.target.value})} className="border rounded p-2 w-full" /></FormField>
              <FormField label="Trade Name"><input value={state.identification.trade_name} onChange={e=>update('identification',{...state.identification, trade_name:e.target.value})} className="border rounded p-2 w-full" /></FormField>
              <FormField label="Organization Type"><select value={state.identification.organization_type} onChange={e=>update('identification',{...state.identification, organization_type:e.target.value})} className="border rounded p-2 w-full text-sm"><option>LLC</option><option>Pvt Ltd</option><option>Partnership</option><option>Proprietor</option><option>Govt</option><option>NGO</option></select></FormField>
              <FormField label="Tax ID" tooltip="GSTIN/PAN/VAT format" error={errors.tax_id}><input value={state.identification.tax_id} onChange={e=>update('identification',{...state.identification, tax_id:e.target.value})} className="border rounded p-2 w-full" /></FormField>
            </div>
          </section>
        )}

        {/* Registration */}
        {currentKey === 'registration' && (
          <section className="space-y-4" aria-labelledby="registration">
            <h2 id="registration" className="font-medium">ERP Registration</h2>
            <FormField label="Registration Type"><select value={state.registration.registration_type} onChange={e=>update('registration',{...state.registration, registration_type:e.target.value as any})} className="border rounded p-2 w-full text-sm"><option>New Implementation</option><option>Migration</option><option>Subsidiary</option></select></FormField>
            <div className="grid md:grid-cols-2 gap-4">
              <FormField label="Primary Address Line1" required error={errors.primary_address_line1}><input value={state.registration.primary_address.line1} onChange={e=>update('registration',{...state.registration, primary_address:{...state.registration.primary_address, line1:e.target.value}})} className="border rounded p-2 w-full" /></FormField>
              <FormField label="City"><input value={state.registration.primary_address.city} onChange={e=>update('registration',{...state.registration, primary_address:{...state.registration.primary_address, city:e.target.value}})} className="border rounded p-2 w-full" /></FormField>
              <FormField label="Country" required error={errors.primary_address_country}><input value={state.registration.primary_address.country} onChange={e=>update('registration',{...state.registration, primary_address:{...state.registration.primary_address, country:e.target.value}})} className="border rounded p-2 w-full" /></FormField>
              <FormField label="Preferred Currency" required error={errors.preferred_currency}><input value={state.registration.preferred_currency} onChange={e=>update('registration',{...state.registration, preferred_currency:e.target.value})} className="border rounded p-2 w-full" /></FormField>
            </div>
          </section>
        )}

        {/* Lifecycle */}
        {currentKey === 'lifecycle' && (
          <section className="space-y-4" aria-labelledby="lifecycle">
            <h2 id="lifecycle" className="font-medium">Lifecycle & Segmentation</h2>
            <div className="grid md:grid-cols-4 gap-4 text-xs">
              <FormField label="Lifecycle Stage"><select value={state.lifecycle.lifecycle_stage} onChange={e=>update('lifecycle',{...state.lifecycle, lifecycle_stage:e.target.value as any})} className="border rounded p-2 w-full text-xs"><option>Lead</option><option>Prospect</option><option>Trial</option><option>Active</option><option>Dormant</option></select></FormField>
              <FormField label="Segment"><select value={state.lifecycle.segment} onChange={e=>update('lifecycle',{...state.lifecycle, segment:e.target.value as any})} className="border rounded p-2 w-full text-xs"><option>SMB</option><option>Mid-Market</option><option>Enterprise</option></select></FormField>
              <FormField label="Tier"><select value={state.lifecycle.tier} onChange={e=>update('lifecycle',{...state.lifecycle, tier:e.target.value as any})} className="border rounded p-2 w-full text-xs"><option>A</option><option>B</option><option>C</option></select></FormField>
              <FormField label="Source Channel"><select value={state.lifecycle.source_channel} onChange={e=>update('lifecycle',{...state.lifecycle, source_channel:e.target.value as any})} className="border rounded p-2 w-full text-xs"><option>Web</option><option>Referral</option><option>Partner</option><option>Sales Team</option></select></FormField>
            </div>
          </section>
        )}

        {/* Sales */}
        {currentKey === 'sales' && (
          <section className="space-y-4" aria-labelledby="sales">
            <h2 id="sales" className="font-medium">Sales Assignment</h2>
            <FormField label="Primary Sales Rep"><input value={state.sales.primary_sales_rep||''} onChange={e=>update('sales',{...state.sales, primary_sales_rep:e.target.value})} className="border rounded p-2 w-full" /></FormField>
            <FormField label="Add Sales Team Member" tooltip="Press Enter to add">
              <input onKeyDown={e=>{ if(e.key==='Enter' && e.currentTarget.value.trim()){ update('sales',{...state.sales, sales_team:[...state.sales.sales_team, e.currentTarget.value.trim()]}); e.currentTarget.value=''; } }} className="border rounded p-2 w-full" />
            </FormField>
            <div className="flex flex-wrap gap-1 text-xs">
              {state.sales.sales_team.map(m => <span key={m} className="px-2 py-1 bg-indigo-600 text-white rounded cursor-pointer" onClick={()=> update('sales',{...state.sales, sales_team: state.sales.sales_team.filter(x=>x!==m)})}>{m} ×</span>)}
              {state.sales.sales_team.length===0 && <span className="text-gray-500">None</span>}
            </div>
          </section>
        )}

        {/* Compliance */}
        {currentKey === 'compliance' && (
          <section className="space-y-4" aria-labelledby="compliance">
            <h2 id="compliance" className="font-medium">Compliance & Risk</h2>
            <div className="grid md:grid-cols-4 gap-4 text-xs">
              <FormField label="KYC Status"><select value={state.compliance.kyc_status} onChange={e=>update('compliance',{...state.compliance, kyc_status:e.target.value as any})} className="border rounded p-2 w-full text-xs"><option>Pending</option><option>Partially Submitted</option><option>Verified</option><option>Rejected</option></select></FormField>
              <FormField label="Risk Category"><select value={state.compliance.risk_category} onChange={e=>update('compliance',{...state.compliance, risk_category:e.target.value as any})} className="border rounded p-2 w-full text-xs"><option>Low</option><option>Medium</option><option>High</option></select></FormField>
              <FormField label="Risk Score" tooltip="0-100"><input type="number" min={0} max={100} value={state.compliance.risk_score} onChange={e=>update('compliance',{...state.compliance, risk_score: parseInt(e.target.value||'0',10)})} className="border rounded p-2 w-full" /></FormField>
              <FormField label="AML Status"><select value={state.compliance.aml_status||''} onChange={e=>update('compliance',{...state.compliance, aml_status:e.target.value})} className="border rounded p-2 w-full text-xs"><option value="">Select</option><option>Clear</option><option>Review</option><option>Escalated</option></select></FormField>
            </div>
            <p className="text-xs text-gray-500">Document uploads & OCR pipeline placeholder (to be implemented).</p>
          </section>
        )}

        {/* Primary Contact */}
        {currentKey === 'primary_contact' && (
          <section className="space-y-4" aria-labelledby="primary-contact">
            <h2 id="primary-contact" className="font-medium">Primary Contact</h2>
            <div className="grid md:grid-cols-3 gap-4">
              <FormField label="Admin Name" required error={errors.admin_name}><input value={state.primary_contact.admin_name} onChange={e=>update('primary_contact',{...state.primary_contact, admin_name:e.target.value})} className="border rounded p-2 w-full" /></FormField>
              <FormField label="Admin Email" required error={errors.admin_email}><input value={state.primary_contact.admin_email} onChange={e=>update('primary_contact',{...state.primary_contact, admin_email:e.target.value})} className="border rounded p-2 w-full" /></FormField>
              <FormField label="Admin Mobile" required error={errors.admin_mobile}><input value={state.primary_contact.admin_mobile} onChange={e=>update('primary_contact',{...state.primary_contact, admin_mobile:e.target.value})} className="border rounded p-2 w-full" /></FormField>
            </div>
            <div className="flex gap-2">
              <button type="button" className="px-3 py-2 bg-indigo-600 text-white rounded text-xs">Provision Admin</button>
              <button type="button" className="px-3 py-2 bg-blue-600 text-white rounded text-xs">Invite Users</button>
            </div>
          </section>
        )}

        {/* Notifications */}
        {currentKey === 'notifications' && (
          <section className="space-y-4" aria-labelledby="notifications">
            <h2 id="notifications" className="font-medium">Notification Settings</h2>
            <div className="flex flex-wrap gap-4 text-xs">
              {(['email','sms','whatsapp'] as const).map(c => (
                <label key={c} className="flex items-center gap-2"><input type="checkbox" checked={state.notifications.channels[c]} onChange={e=>update('notifications',{...state.notifications, channels:{...state.notifications.channels, [c]:e.target.checked}})} /> {c.toUpperCase()}</label>
              ))}
            </div>
            <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={state.notifications.daily_summary} onChange={e=>update('notifications',{...state.notifications, daily_summary:e.target.checked})} /> Daily Summary</label>
            <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={state.notifications.approvals_alerts} onChange={e=>update('notifications',{...state.notifications, approvals_alerts:e.target.checked})} /> Approvals & Alerts</label>
          </section>
        )}

        {/* Legal */}
        {currentKey === 'legal' && (
          <section className="space-y-4" aria-labelledby="legal">
            <h2 id="legal" className="font-medium">Legal</h2>
            <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={state.legal.terms_of_service} onChange={e=>update('legal',{...state.legal, terms_of_service:e.target.checked})} /> Terms of Service Consent*</label>
            {errors.terms_of_service && <p className="text-red-600 text-xs" role="alert">{errors.terms_of_service}</p>}
            <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={!!state.legal.dpa} onChange={e=>update('legal',{...state.legal, dpa:e.target.checked})} /> Data Processing Agreement (DPA)</label>
            <p className="text-xs text-gray-500">Optional NDA upload placeholder.</p>
          </section>
        )}

        <div className="flex justify-between pt-4 border-t">
          <div className="flex gap-2">
            <SaveDraftButton onClick={saveDraft} disabled={saving} />
            {draftId && <span className="text-xs text-green-700">Draft ID: {draftId}</span>}
          </div>
          <div className="flex gap-2">
            {currentIndex>0 && <button type="button" onClick={back} className="px-4 py-2 bg-gray-200 rounded text-xs">Back</button>}
            {currentIndex < STEPS.length-1 && <button type="button" onClick={next} className="px-4 py-2 bg-blue-600 text-white rounded text-xs">Next</button>}
            {currentIndex === STEPS.length-1 && <button type="button" disabled={saving} onClick={finalize} className="px-4 py-2 bg-green-600 text-white rounded text-xs">Finish</button>}
          </div>
        </div>
      </div>
  </main>
  </RequirePlatformOrTenantAdmin>
  );
}
