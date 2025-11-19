// Filter context to only what the role can access. Mask sensitive info.
export async function rbacFilter(userId: string | number, ctx: any): Promise<any> {
  const roles: string[] = Array.isArray(ctx?.roles) ? ctx.roles : [];
  const isSuperAdmin = roles.includes('SUPER_ADMIN') || roles.includes('ENTERPRISE_ADMIN');

  const safe: any = { ...ctx };
  // Never send secrets
  delete safe.tokens;
  delete safe.internal;

  // Mask PII fields inside formJson
  if (safe.formJson) {
    safe.formJson = maskPIIData(safe.formJson);
  }

  // Enforce AI settings.allowedModules, if configured
  try {
    const allowed = await getAllowedModules();
    if (Array.isArray(allowed) && allowed.length > 0) {
      // Filter scope.modules
      if (safe.scope?.modules) {
        const mods = Array.isArray(safe.scope.modules) ? safe.scope.modules : [];
        safe.scope.modules = mods.filter((m: any) => allowed.includes(moduleKey(m)));
      }
      // If page.module is present and not allowed, redact page details
      if (safe.page?.module) {
        const modKey = moduleKey(safe.page.module);
        if (!allowed.includes(modKey)) {
          safe.page = safe.page?.path ? { path: safe.page.path, module: 'restricted' } : undefined;
        }
      }
    }
  } catch {
    // If settings cannot be read (e.g., client-side), continue without enforcing
  }

  // Limit modules for non-admins
  if (!isSuperAdmin && safe.scope?.modules) {
    safe.scope.modules = (safe.scope.modules || []).slice(0, 10);
  }

  return safe;
}

// Backward-compatible alias retained for any legacy imports
export const maskPII: (data: any) => any = (data: any): any => maskPIIData(data);

function maskPIIData(data: any): any {
  if (data == null) return data;
  if (Array.isArray(data)) return data.map(maskPIIData);
  if (typeof data === 'object') {
    const out: any = {};
    for (const k of Object.keys(data)) {
      const v = (data as any)[k];
      const key = k.toLowerCase();
      if (['email', 'phone', 'ssn', 'pan', 'aadhar', 'password'].includes(key)) {
        out[k] = '***';
      } else {
        out[k] = maskPIIData(v);
      }
    }
    return out;
  }
  return data;
}

// Helpers
async function getAllowedModules(): Promise<string[] | null> {
  // Read from data/ai/settings.json (server only). If not available, return null.
  try {
    const { promises: fs } = await import('fs');
    const path = await import('path');
    const file = path.join(process.cwd(), 'data', 'ai', 'settings.json');
    const buf = await fs.readFile(file, 'utf8');
    const json = JSON.parse(buf);
    const arr = json?.allowedModules;
    if (Array.isArray(arr)) return arr.map((x: any) => String(x));
    return null;
  } catch {
    return null;
  }
}

function moduleKey(m: any): string {
  // Normalize module reference to a string key for comparison
  if (m == null) return '';
  if (typeof m === 'string') return m;
  if (typeof m === 'number') return String(m);
  if (typeof m === 'object') {
    return String((m as any).id ?? (m as any).slug ?? (m as any).name ?? '');
  }
  return '';
}
