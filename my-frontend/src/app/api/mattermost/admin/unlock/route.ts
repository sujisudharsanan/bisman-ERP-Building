import { NextResponse } from 'next/server';

// Best-effort unlock/reset password workflow for Mattermost users using admin token
// Input: { email: string, new_password?: string }
// Output: { ok: boolean, steps: Array<{ name: string, status: number|null, ok: boolean, error?: string }> }

export async function POST(req: Request) {
  const body = await req.json().catch(()=>({}));
  const email = String(body?.email || '').trim().toLowerCase();
  const newPassword = String(body?.new_password || process.env.NEXT_PUBLIC_MM_DEMO_PASSWORD || 'Welcome@2025');
  const base = (process.env.MM_BASE_URL || 'http://localhost:8065').replace(/\/$/, '');
  const admin = process.env.MM_ADMIN_TOKEN || '';

  if (!email) return NextResponse.json({ ok:false, error:'email_required' }, { status: 400 });
  if (!admin) return NextResponse.json({ ok:false, error:'missing_MM_ADMIN_TOKEN' }, { status: 500 });

  const steps: Array<{ name: string; status: number|null; ok: boolean; error?: string }> = [];

  async function step(name: string, run: () => Promise<Response>): Promise<Response|undefined> {
    try {
      const r = await run();
      steps.push({ name, status: r.status, ok: r.ok });
      return r;
    } catch (e: any) {
      steps.push({ name, status: null, ok: false, error: e?.message || String(e) });
      return undefined;
    }
  }

  // 1) Find user by email
  const find = await step('find_user_by_email', () => fetch(`${base}/api/v4/users/email/${encodeURIComponent(email)}`, {
    headers: { 'Authorization': `Bearer ${admin}` },
    cache: 'no-store',
  }));
  if (!find?.ok) return NextResponse.json({ ok:false, steps }, { status: 404 });
  const user = await find.json();
  const userId = user?.id as string;
  if (!userId) return NextResponse.json({ ok:false, steps, error:'user_id_missing' }, { status: 500 });

  // 2) Attempt to reset password (admin). Different MM versions differ; try multiple endpoints.
  await step('reset_password_put_users_password', () => fetch(`${base}/api/v4/users/${userId}/password`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${admin}` },
    body: JSON.stringify({ new_password: newPassword }),
  }));

  await step('reset_password_post_users_password_reset', () => fetch(`${base}/api/v4/users/${userId}/password/reset`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${admin}` },
    body: JSON.stringify({ new_password: newPassword }),
  }));

  // 3) Deactivate and reactivate the user to clear lock counters (best-effort)
  await step('deactivate_user', () => fetch(`${base}/api/v4/users/${userId}/active`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${admin}` },
    body: JSON.stringify({ active: false }),
  }));

  await step('reactivate_user', () => fetch(`${base}/api/v4/users/${userId}/active`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${admin}` },
    body: JSON.stringify({ active: true }),
  }));

  // 4) Revoke sessions just in case
  await step('revoke_all_sessions', () => fetch(`${base}/api/v4/users/${userId}/sessions/revoke/all`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${admin}` },
  }));

  return NextResponse.json({ ok:true, steps });
}
