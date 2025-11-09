import { NextResponse } from 'next/server';
import { mmAddUserToChannel, mmAddUserToTeam, mmCreateUser, mmEnsureChannel, mmEnsureTeam, mmFindUserByEmail } from '@/lib/mattermostClient';

const TEAM_SLUG = process.env.MM_TEAM_SLUG || 'erp';
const DEFAULT_CHANNELS = (
  process.env.MM_CHANNELS || 'dispatch-team:Dispatch Team,driver-support:Driver Support,customer-support:Customer Support,management-group:Management Group'
).split(',').map((s) => ({ name: s.split(':')[0], display_name: s.split(':')[1] })) as Array<{ name: string; display_name: string }>;

function allowedChannelNamesForRole(roleRaw?: string) {
  const role = (roleRaw || '').toUpperCase();
  // Adjust mapping as needed for your ERP roles
  if (['SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'ADMIN'].includes(role)) {
    // Full access: all default channels
    return DEFAULT_CHANNELS.map(c => c.name);
  }
  if (role === 'STAFF') {
    return ['dispatch-team', 'customer-support'];
  }
  // Fallback: minimal access to support only
  return ['customer-support'];
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const user = body?.user as { id: string|number; email: string; name?: string; username?: string; password?: string; role?: string };
    if (!user?.email) return NextResponse.json({ ok:false, error:'email_required' }, { status: 400 });

    const team = await mmEnsureTeam(TEAM_SLUG, 'ERP Workspace');
    const channels = [] as any[];
    for (const c of DEFAULT_CHANNELS) channels.push(await mmEnsureChannel(team.id, c.name, c.display_name));

    let mmUser = await mmFindUserByEmail(user.email);
    if (!mmUser) {
      const username = (user.username || user.name || user.email.split('@')[0]).toLowerCase().replace(/[^a-z0-9._-]/g,'');
      // Use demo password for development; in production, sync from ERP user passwords
      const password = user.password || process.env.NEXT_PUBLIC_MM_DEMO_PASSWORD || 'Welcome@2025';
      mmUser = await mmCreateUser({ email: user.email, username: username || `u${user.id}`, password, first_name: user.name?.split(' ')?.[0] || '', last_name: user.name?.split(' ')?.slice(1)?.join(' ') || '' });
      // IMPORTANT: In production, store password from ERP user for auto-login
    }

    await mmAddUserToTeam(team.id, mmUser.id);
    const allow = new Set(allowedChannelNamesForRole(user.role));
    for (const ch of channels) {
      if (allow.has(ch.name)) {
        await mmAddUserToChannel(ch.id, mmUser.id);
      }
    }

    return NextResponse.json({ ok:true, team, user:mmUser, channels });
  } catch (e: any) {
    return NextResponse.json({ ok:false, error: e?.message || 'mm_provision_failed' }, { status: 500 });
  }
}
