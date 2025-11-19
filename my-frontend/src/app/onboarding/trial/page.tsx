"use client";
import React, { useState, useEffect } from 'react';
import API_BASE from '@/config/api';
import { TrialOnboardingInput } from '@/types/onboarding';
import { validateTrial } from '@/lib/validation/onboarding';

const MODULE_OPTIONS = ['HR','Inventory','Sales','Finance','Tasks','Approvals'];
const INDUSTRY_OPTIONS = ['Retail','Manufacturing','Logistics','Tech','Services','Other'];
const PURPOSE_OPTIONS = ['HR','Finance','Inventory','CRM','Multi-module'];

function ProgressIndicator({ step }: { step: number }) {
  return <div aria-label="Progress" className="flex items-center gap-1 text-xs"><span className="font-medium">Step {step} / 4</span><div className="flex gap-1">{[1,2,3,4].map(s => <div key={s} className={`h-1 w-6 rounded ${s<=step? 'bg-blue-600':'bg-gray-200'}`}></div>)}</div></div>;
}

export default function TrialOnboardingPage() {
  const [form, setForm] = useState<TrialOnboardingInput>({
    full_name: '', work_email: '', mobile_number: '', company_name: '', country: '', timezone: '', password: '', confirm_password: '', enable_mfa: false,
    industry: '', purpose: '', expected_volume: '', preferred_currency: '', enable_modules: [], preferred_language: 'en', consent_terms: false, consent_privacy: false, save_as_draft: false
  });
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string,string>>({});
  const [draftId, setDraftId] = useState<string | undefined>(undefined);
  const [magicLink, setMagicLink] = useState<string | null>(null);
  const [step, setStep] = useState(1);

  useEffect(() => {
    try { setForm(f => ({ ...f, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone })); } catch {}
    // Prefill draft if client_id present in query
    const params = new URLSearchParams(window.location.search);
    const cid = params.get('client_id');
    if (cid) {
      setDraftId(cid);
      fetch(`/api/public/onboarding/trial/${cid}/minimal`).then(r=>r.json()).then(json => {
        if (json?.data) {
          setForm(f => ({
            ...f,
            company_name: json.data.company_name || f.company_name,
          }));
        }
      }).catch(()=>{});
    }
  }, []);

  function update<K extends keyof TrialOnboardingInput>(key: K, value: TrialOnboardingInput[K]) { setForm(prev => ({ ...prev, [key]: value })); }
  function toggleModule(m: string) { setForm(f => ({ ...f, enable_modules: f.enable_modules.includes(m) ? f.enable_modules.filter(x=>x!==m) : [...f.enable_modules, m] })); }

  async function submit(draft: boolean) {
    setSubmitting(true);
    try {
      const payload: any = { ...form, save_as_draft: draft, draft_client_id: draftId };
      const v = validateTrial(payload);
      if (!v.valid && !draft) { setErrors(v.errors); setSubmitting(false); return; }
      setErrors({});
      const res = await fetch(`${API_BASE}/api/public/onboarding/trial`, { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify(payload) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'submit_failed');
      if (draft) {
        setDraftId(json.client_id);
      } else {
        setMagicLink(json.magic_link || null);
      }
      alert(draft? 'Draft saved' : 'Trial started');
    } catch (e:any) {
      alert(e.message);
    } finally { setSubmitting(false); }
  }

  async function requestMagicLink() {
    if (!draftId || !form.work_email) { alert('Draft ID and email required'); return; }
    const res = await fetch(`${API_BASE}/api/public/onboarding/trial/magic-link`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ client_id: draftId, email: form.work_email }) });
    const json = await res.json();
    if (!res.ok) { alert(json.error || 'magic_link_error'); return; }
    setMagicLink(json.magic_link);
  }

  return (
    <main className="min-h-screen bg-gray-50 p-4 flex flex-col items-center">
      <div className="w-full max-w-3xl bg-white rounded shadow p-6 space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-semibold">Start Your Free Trial</h1>
            <p className="text-sm text-gray-500">Minimal friction onboarding. 14-day trial. No credit card.</p>
          </div>
          <ProgressIndicator step={step} />
        </div>

        {step === 1 && (
          <section aria-labelledby="identity-access" className="space-y-4">
            <h2 id="identity-access" className="font-medium">Identity & Access</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium">Full Name*</label>
                <input value={form.full_name} onChange={e=>update('full_name', e.target.value)} className="mt-1 w-full border rounded p-2" aria-invalid={!!errors.full_name} />
                {errors.full_name && <p className="text-red-600 text-xs" role="alert">{errors.full_name}</p>}
              </div>
              <div>
                <label className="text-xs font-medium">Work Email*</label>
                <input type="email" value={form.work_email} onChange={e=>update('work_email', e.target.value)} className="mt-1 w-full border rounded p-2" aria-invalid={!!errors.work_email} />
                {errors.work_email && <p className="text-red-600 text-xs" role="alert">{errors.work_email}</p>}
              </div>
              <div>
                <label className="text-xs font-medium">Mobile Number</label>
                <input value={form.mobile_number} onChange={e=>update('mobile_number', e.target.value)} className="mt-1 w-full border rounded p-2" />
              </div>
              <div>
                <label className="text-xs font-medium">Company Name (Optional)</label>
                <input value={form.company_name} onChange={e=>update('company_name', e.target.value)} className="mt-1 w-full border rounded p-2" />
              </div>
              <div>
                <label className="text-xs font-medium">Country*</label>
                <input value={form.country} onChange={e=>update('country', e.target.value)} className="mt-1 w-full border rounded p-2" />
              </div>
              <div>
                <label className="text-xs font-medium">Timezone (Auto)</label>
                <input value={form.timezone} readOnly className="mt-1 w-full border rounded p-2 bg-gray-100 text-gray-600" />
              </div>
              <div>
                <label className="text-xs font-medium">Password*</label>
                <input type="password" value={form.password} onChange={e=>update('password', e.target.value)} className="mt-1 w-full border rounded p-2" aria-invalid={!!errors.password} />
                {errors.password && <p className="text-red-600 text-xs" role="alert">{errors.password}</p>}
              </div>
              <div>
                <label className="text-xs font-medium">Confirm Password*</label>
                <input type="password" value={form.confirm_password} onChange={e=>update('confirm_password', e.target.value)} className="mt-1 w-full border rounded p-2" aria-invalid={!!errors.confirm_password} />
                {errors.confirm_password && <p className="text-red-600 text-xs" role="alert">{errors.confirm_password}</p>}
              </div>
            </div>
            <label className="inline-flex items-center gap-2 text-xs">
              <input type="checkbox" checked={form.enable_mfa} onChange={e=>update('enable_mfa', e.target.checked)} /> Enable MFA
            </label>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={()=>setStep(2)} className="px-4 py-2 bg-blue-600 text-white rounded text-sm">Next</button>
            </div>
          </section>
        )}

        {step === 2 && (
          <section aria-labelledby="business-info" className="space-y-4">
            <h2 id="business-info" className="font-medium">Business Information</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium">Industry</label>
                <select value={form.industry} onChange={e=>update('industry', e.target.value)} className="mt-1 w-full border rounded p-2 text-sm">
                  <option value="">Select</option>
                  {INDUSTRY_OPTIONS.map(i => <option key={i}>{i}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium">Purpose</label>
                <select value={form.purpose} onChange={e=>update('purpose', e.target.value)} className="mt-1 w-full border rounded p-2 text-sm">
                  <option value="">Select</option>
                  {PURPOSE_OPTIONS.map(p => <option key={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium">Expected Monthly Volume (Optional)</label>
                <input value={form.expected_volume} onChange={e=>update('expected_volume', e.target.value)} className="mt-1 w-full border rounded p-2" />
              </div>
              <div>
                <label className="text-xs font-medium">Preferred Currency (Auto)</label>
                <input value={form.preferred_currency} onChange={e=>update('preferred_currency', e.target.value)} placeholder="USD" className="mt-1 w-full border rounded p-2" />
              </div>
            </div>
            <div className="flex justify-between">
              <button type="button" onClick={()=>setStep(1)} className="px-4 py-2 bg-gray-200 rounded text-sm">Back</button>
              <button type="button" onClick={()=>setStep(3)} className="px-4 py-2 bg-blue-600 text-white rounded text-sm">Next</button>
            </div>
          </section>
        )}

        {step === 3 && (
          <section aria-labelledby="system-setup" className="space-y-4">
            <h2 id="system-setup" className="font-medium">System Setup</h2>
            <p className="text-xs text-gray-500">Trial Start/Expiry auto-generated on submit (14 days)</p>
            <fieldset className="grid md:grid-cols-3 gap-2" aria-label="Enable Modules">
              {MODULE_OPTIONS.map(m => (
                <label key={m} className="flex items-center gap-2 text-xs border rounded p-2 cursor-pointer">
                  <input type="checkbox" checked={form.enable_modules.includes(m)} onChange={()=>toggleModule(m)} /> {m}
                </label>
              ))}
            </fieldset>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium">Preferred Language</label>
                <select value={form.preferred_language} onChange={e=>update('preferred_language', e.target.value)} className="mt-1 w-full border rounded p-2 text-sm">
                  <option value="en">English</option>
                  <option value="es">Spanish</option>
                  <option value="fr">French</option>
                  <option value="hi">Hindi</option>
                </select>
              </div>
            </div>
            <div className="flex justify-between">
              <button type="button" onClick={()=>setStep(2)} className="px-4 py-2 bg-gray-200 rounded text-sm">Back</button>
              <button type="button" onClick={()=>setStep(4)} className="px-4 py-2 bg-blue-600 text-white rounded text-sm">Next</button>
            </div>
          </section>
        )}

        {step === 4 && (
          <section aria-labelledby="communication-security" className="space-y-4">
            <h2 id="communication-security" className="font-medium">Communication & Security</h2>
            <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={form.consent_terms} onChange={e=>update('consent_terms', e.target.checked)} /> Accept Terms & Conditions*</label>
            {errors.consent_terms && <p className="text-red-600 text-xs" role="alert">{errors.consent_terms}</p>}
            <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={form.consent_privacy} onChange={e=>update('consent_privacy', e.target.checked)} /> Accept Privacy Policy*</label>
            {errors.consent_privacy && <p className="text-red-600 text-xs" role="alert">{errors.consent_privacy}</p>}
            <div className="flex flex-wrap gap-2 mt-2">
              <button disabled={submitting} onClick={()=>submit(true)} className="px-4 py-2 bg-yellow-500 text-white rounded text-sm">Save Draft</button>
              <button disabled={submitting} onClick={()=>submit(false)} className="px-4 py-2 bg-green-600 text-white rounded text-sm">Start Trial</button>
              {draftId && <button type="button" onClick={requestMagicLink} className="px-4 py-2 bg-indigo-600 text-white rounded text-sm">Get Magic Link</button>}
            </div>
            {magicLink && (
              <div className="text-xs bg-indigo-50 border border-indigo-200 rounded p-2 mt-2" role="status">
                Magic Link Token: <span className="font-mono break-all">{magicLink}</span>
                <p className="mt-1">Keep this safe. Build resume URL: <code>https://your-frontend/onboarding/trial/resume/{magicLink}</code></p>
              </div>
            )}
            <div className="flex justify-start mt-4">
              <button type="button" onClick={()=>setStep(3)} className="px-4 py-2 bg-gray-200 rounded text-sm">Back</button>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
