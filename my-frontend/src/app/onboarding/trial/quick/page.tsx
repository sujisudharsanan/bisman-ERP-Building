"use client";
import React, { useEffect, useMemo, useState } from 'react';
import { z } from 'zod';

const SignupSchema = z.object({
  email: z.string().email(),
  mobile: z.string().regex(/^\+?[1-9]\d{7,14}$/),
  businessType: z.enum(['Retail','Manufacturing','Services','Logistics','Tech','Other']),
  employeeCount: z.enum(['1-10','11-50','51-200','201-1000','1000+']),
  locationCountry: z.string().min(2),
  locationCity: z.string().min(2),
  companyType: z.enum(['Proprietorship','Partnership','Pvt Ltd','LLC','Public','NGO','Other'])
});

const OtpSchema = z.object({ code: z.string().regex(/^\d{6}$/) });

type SignupInput = z.infer<typeof SignupSchema>;

function useLocalDraft(key: string, ttlHours = 24) {
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const obj = JSON.parse(raw);
        if (Date.now() - obj.ts > ttlHours*3600*1000) localStorage.removeItem(key);
      }
    } catch {}
    setLoaded(true);
  }, [key, ttlHours]);
  return {
    load: () => {
      try { const raw = localStorage.getItem(key); if (!raw) return null; const obj = JSON.parse(raw); return obj.data; } catch { return null }
    },
    save: (data: any) => { try { localStorage.setItem(key, JSON.stringify({ ts: Date.now(), data })) } catch {} },
    clear: () => { try { localStorage.removeItem(key) } catch {} },
    loaded
  };
}

function useModulesList(){
  const [mods, setMods] = useState<any[]>([]);
  useEffect(()=>{ fetch('/api/trial/modules/list').then(r=>r.json()).then(j=>setMods(j.data||[])).catch(()=>{}) },[]);
  return mods;
}

export default function QuickTrialPage(){
  const draft = useLocalDraft('trial_quick_draft');
  const [step, setStep] = useState<1|2>(1);
  const [signup, setSignup] = useState<SignupInput>({
    email:'', mobile:'', businessType:'Retail', employeeCount:'1-10', locationCountry:'', locationCity:'', companyType:'Proprietorship'
  });
  const [errors, setErrors] = useState<Record<string,string>>({});
  const [requestId, setRequestId] = useState<string|null>(null);
  const [tempToken, setTempToken] = useState<string|null>(null);
  const [otpCode, setOtpCode] = useState('');
  const modules = useModulesList();
  const [selected, setSelected] = useState<string[]>([]);
  const [demoData, setDemoData] = useState(true);
  const [otpTtl, setOtpTtl] = useState<number>(0);
  const [resendBusy, setResendBusy] = useState(false);
  const [serverMsg, setServerMsg] = useState<string | null>(null);

  useEffect(()=>{
    if (!draft.loaded) return;
    const d = draft.load(); if (d) setSignup({ ...signup, ...d });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft.loaded]);

  useEffect(()=>{ if (draft.loaded) draft.save(signup) }, [signup, draft]);

  function update<K extends keyof SignupInput>(k: K, v: SignupInput[K]){ setSignup(s=>({ ...s, [k]: v })); }

  async function onRequestOtp(){
    const res = SignupSchema.safeParse(signup);
    if (!res.success){
      const e: Record<string,string> = {}; res.error.issues.forEach(i=>{ e[i.path.join('.')] = i.message }); setErrors(e); return;
    }
    setErrors({});
  const r = await fetch('/api/trial/request-otp', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ ...signup, deviceInfo: navigator.userAgent }) });
    const j = await r.json();
  if (!r.ok){ setServerMsg(j.error || 'OTP request failed'); return; }
  setServerMsg(null);
  setRequestId(j.requestId);
  setOtpTtl(Number(j.ttlSeconds||0));
  setStep(2);
  }

  async function onVerify(){
    if (!requestId) return;
    const v = OtpSchema.safeParse({ code: otpCode });
    if (!v.success){ setErrors({ code: 'Enter 6-digit code' }); return; }
    const r = await fetch('/api/trial/verify-otp', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ requestId, code: otpCode }) });
    const j = await r.json();
  if (!r.ok){ setServerMsg(j.error || 'Invalid code'); return; }
    setTempToken(j.tempToken);
  setServerMsg(null);
  }

  async function onComplete(){
    if (!requestId || !tempToken) return;
    if (selected.length === 0){ alert('Select at least one module'); return; }
    const r = await fetch('/api/trial/complete', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ requestId, tempToken, modules: selected, demoData }) });
    const j = await r.json();
    if (!r.ok){ setServerMsg(j.error || 'Complete failed'); return; }
    draft.clear();
    window.location.href = '/dashboard?trial=1';
  }

  // Countdown for OTP TTL
  useEffect(()=>{
    if (step !== 2 || !otpTtl) return;
    const t = setInterval(()=> setOtpTtl(x=> x>0? x-1 : 0), 1000);
    return ()=> clearInterval(t);
  }, [step, otpTtl]);

  async function onResend(){
    if (!requestId || resendBusy || otpTtl > 15) return; // throttle frequent clicks
    setResendBusy(true);
    try{
      const r = await fetch('/api/trial/resend-otp', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ requestId }) });
      const j = await r.json();
      if (!r.ok){ setServerMsg(j.error || 'Resend failed'); }
      else {
        setServerMsg('A new code has been sent.');
        setOtpTtl(Number(j.ttlSeconds||otpTtl));
      }
    } finally {
      setResendBusy(false);
    }
  }

  const disabled = useMemo(()=>{
    const r = SignupSchema.safeParse(signup); return !r.success; 
  }, [signup]);

  return (
    <main className="min-h-screen bg-gray-50 p-4 flex justify-center">
      <div className="w-full max-w-xl bg-white rounded shadow p-6 space-y-6">
        <h1 className="text-xl font-semibold">Try free for 14 days — no credit card required.</h1>
  {serverMsg && (<div role="status" className="text-xs p-2 rounded bg-yellow-50 text-yellow-800">{serverMsg}</div>)}
        {step===1 && (
          <section aria-labelledby="signup" className="space-y-3">
            <h2 id="signup" className="font-medium">Step 1 of 2 — Sign up</h2>
            <label className="block text-xs font-medium">Email*</label>
            <input className="w-full border rounded p-2" type="email" value={signup.email} onChange={e=>update('email', e.target.value)} aria-invalid={!!errors.email} />
            {errors.email && <p className="text-red-600 text-xs">{errors.email}</p>}

            <label className="block text-xs font-medium mt-2">Mobile Number*</label>
            <input className="w-full border rounded p-2" value={signup.mobile} onChange={e=>update('mobile', e.target.value)} aria-invalid={!!errors.mobile} />
            {errors.mobile && <p className="text-red-600 text-xs">{errors.mobile}</p>}

            <div className="grid grid-cols-2 gap-3 mt-2">
              <div>
                <label className="block text-xs font-medium">Business Type*</label>
                <select className="w-full border rounded p-2 text-sm" value={signup.businessType} onChange={e=>update('businessType', e.target.value as any)}>
                  {['Retail','Manufacturing','Services','Logistics','Tech','Other'].map(o=> <option key={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium">Employee Count*</label>
                <select className="w-full border rounded p-2 text-sm" value={signup.employeeCount} onChange={e=>update('employeeCount', e.target.value as any)}>
                  {['1-10','11-50','51-200','201-1000','1000+'].map(o=> <option key={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium">Country*</label>
                <input className="w-full border rounded p-2" value={signup.locationCountry} onChange={e=>update('locationCountry', e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-medium">City*</label>
                <input className="w-full border rounded p-2" value={signup.locationCity} onChange={e=>update('locationCity', e.target.value)} />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium">Company Type*</label>
                <select className="w-full border rounded p-2 text-sm" value={signup.companyType} onChange={e=>update('companyType', e.target.value as any)}>
                  {['Proprietorship','Partnership','Pvt Ltd','LLC','Public','NGO','Other'].map(o=> <option key={o}>{o}</option>)}
                </select>
              </div>
            </div>

            <div className="flex justify-end mt-4">
              <button className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50" disabled={disabled} onClick={onRequestOtp}>Continue</button>
            </div>
          </section>
        )}

        {step===2 && (
          <section aria-labelledby="otp-modules" className="space-y-3">
            <h2 id="otp-modules" className="font-medium">Step 2 of 2 — OTP & Modules</h2>
            <p className="text-xs text-gray-600">Enter the 6-digit code sent to your email/phone. Expires in {Math.floor(otpTtl/60)}:{String(otpTtl%60).padStart(2,'0')}.</p>
            <div className="flex gap-2 items-end">
              <input className="border rounded p-2 w-40" placeholder="123456" value={otpCode} onChange={e=>setOtpCode(e.target.value)} aria-label="OTP code" />
              <button className="px-3 py-2 bg-gray-200 rounded" onClick={onVerify}>Verify & Continue</button>
              <button className="px-3 py-2 rounded border" disabled={resendBusy || otpTtl>15} onClick={onResend} aria-disabled={resendBusy || otpTtl>15}>
                {resendBusy? 'Sending...' : otpTtl>15? 'Wait...' : 'Resend code'}
              </button>
            </div>

            {tempToken && (
              <div className="mt-4">
                <h3 className="text-sm font-medium">Select Modules</h3>
                <div className="grid grid-cols-1 gap-2 mt-2">
                  {modules.map((m:any)=> (
                    <label key={m.id} className={`border rounded p-2 flex items-start gap-2 ${m.disabled? 'opacity-60 cursor-not-allowed':''}`}>
                      <input type="checkbox" disabled={!!m.disabled} checked={selected.includes(m.id)} onChange={()=> setSelected(s=> s.includes(m.id)? s.filter(x=>x!==m.id) : [...s, m.id])} aria-disabled={!!m.disabled} />
                      <div>
                        <div className="text-sm font-medium">{m.name}</div>
                        <div className="text-xs text-gray-600">{m.description}</div>
                      </div>
                    </label>
                  ))}
                </div>
                <label className="mt-3 inline-flex items-center gap-2 text-xs"><input type="checkbox" checked={demoData} onChange={e=>setDemoData(e.target.checked)} /> Load sample demo data</label>
                <div className="flex justify-end mt-4">
                  <button className="bg-green-600 text-white px-4 py-2 rounded" onClick={onComplete}>Create Trial</button>
                </div>
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
