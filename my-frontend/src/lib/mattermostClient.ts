const MM_BASE = (process.env.MM_BASE_URL || '').replace(/\/$/, '');
const MM_ADMIN_TOKEN = process.env.MM_ADMIN_TOKEN || '';

function headers(token?: string) {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token || MM_ADMIN_TOKEN}`,
  } as Record<string,string>;
}

export async function mmFindUserByEmail(email: string) {
  const r = await fetch(`${MM_BASE}/api/v4/users/email/${encodeURIComponent(email)}`, { headers: headers() });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`mm_users_email_${r.status}`);
  return r.json();
}

export async function mmCreateUser(p: { email: string; username: string; password: string; first_name?: string; last_name?: string }) {
  const r = await fetch(`${MM_BASE}/api/v4/users`, { method: 'POST', headers: headers(), body: JSON.stringify(p) });
  if (!r.ok) throw new Error(`mm_create_user_${r.status}`);
  return r.json();
}

export async function mmEnsureTeam(slug: string, display_name: string) {
  const g = await fetch(`${MM_BASE}/api/v4/teams/name/${slug}`, { headers: headers() });
  if (g.ok) return g.json();
  const r = await fetch(`${MM_BASE}/api/v4/teams`, { method: 'POST', headers: headers(), body: JSON.stringify({ name: slug, display_name, type: 'O' }) });
  if (!r.ok) throw new Error(`mm_create_team_${r.status}`);
  return r.json();
}

export async function mmEnsureChannel(teamId: string, name: string, display_name: string) {
  const list = await fetch(`${MM_BASE}/api/v4/teams/${teamId}/channels`, { headers: headers() });
  if (list.ok) {
    const arr = await list.json();
    const found = arr.find((c: any) => c.name === name);
    if (found) return found;
  }
  const r = await fetch(`${MM_BASE}/api/v4/channels`, { method: 'POST', headers: headers(), body: JSON.stringify({ team_id: teamId, name, display_name, type: 'O' }) });
  if (!r.ok) throw new Error(`mm_create_channel_${r.status}`);
  return r.json();
}

export async function mmAddUserToTeam(teamId: string, userId: string) {
  await fetch(`${MM_BASE}/api/v4/teams/${teamId}/members`, { method: 'POST', headers: headers(), body: JSON.stringify({ team_id: teamId, user_id: userId }) });
}

export async function mmAddUserToChannel(channelId: string, userId: string) {
  await fetch(`${MM_BASE}/api/v4/channels/${channelId}/members`, { method: 'POST', headers: headers(), body: JSON.stringify({ user_id: userId }) });
}

export async function mmLogin(login_id: string, password: string) {
  return fetch(`${MM_BASE}/api/v4/users/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ login_id, password }), redirect: 'manual' });
}
