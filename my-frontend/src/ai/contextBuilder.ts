// Build AI context from ERP for a user. Keep data minimal and role-filtered later.
export async function buildContext(userId: string | number, extra?: any) {
  // TODO: call your existing API to fetch user, roles, org, and page/module hints
  // Keep very small to avoid leaking. rbacFilter will trim further.
  const session = await getSession();
  return {
    userId,
    roles: await getUserRoles(userId),
  scope: await getUserScope(userId),
    allowedModules: Array.isArray(session?.user?.allowedModules) ? session.user.allowedModules : undefined,
  // Normalize page so we can evaluate module allowlist in the filter
  page: extra?.path || extra?.module ? { path: extra?.path, module: extra?.module } : extra?.page,
    formJson: extra?.formJson,
    now: new Date().toISOString(),
  };
}

async function getUserRoles(userId: string | number) {
  try {
    const r = await fetch(`/api/users/${userId}/roles`, { credentials: 'include' });
    if (r.ok) return r.json();
  } catch {}
  return [] as string[];
}

async function getUserScope(userId: string | number) {
  try {
    const r = await fetch(`/api/users/${userId}/scope`, { credentials: 'include' });
    if (r.ok) return r.json();
  } catch {}
  return { modules: [], orgId: null };
}

async function getSession(): Promise<any | null> {
  try {
    const r = await fetch('/api/session', { credentials: 'include' });
    if (r.ok) return r.json();
  } catch {}
  return null;
}
