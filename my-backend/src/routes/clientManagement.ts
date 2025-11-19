import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../../middleware/auth';
import { isPlatformAdmin, isTenantAdmin, ROLE_PLATFORM_ADMIN } from '../constants/roles';

const router = Router();
const prisma = new PrismaClient();
// Note: Some editors may not pick up freshly generated Prisma delegates immediately.
// Casting to any avoids transient TS errors for valid delegates like clientModulePermission/clientDailyUsage.
const prismaAny: any = prisma;

function generateTempPassword(length: number = 12) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789@$!%*#?&';
  let pwd = '';
  for (let i = 0; i < length; i++) pwd += chars[Math.floor(Math.random() * chars.length)];
  return pwd;
}

// Create SuperAdmin (tenant owner) - platform only
router.post('/super-admins', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!isPlatformAdmin(user?.role)) {
      return res.status(403).json({ error: 'Platform admin only' });
    }

    const { name, email, password, productType = 'BUSINESS_ERP', enterprise_admin_id = 1 } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'name, email, password required' });
    }
    const existing = await prisma.superAdmin.findUnique({ where: { email } });
    if (existing) return res.status(400).json({ error: 'SuperAdmin email already exists' });
    const bcrypt = require('bcryptjs');
    const hashed = await bcrypt.hash(password, 10);
    const created = await prisma.superAdmin.create({
      data: {
        name,
        email,
        password: hashed,
        productType,
        created_by: enterprise_admin_id,
      },
    });
    res.status(201).json({ success: true, data: created });
  } catch (e: any) {
    console.error('Create SuperAdmin error', e);
    res.status(500).json({ error: 'Failed to create SuperAdmin', details: e.message });
  }
});

// List clients (platform sees all, tenant admin sees own)
router.get('/clients', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const where: any = {};
    const status = String(req.query.status || '').trim();
  const q = String(req.query.q || '').trim().toLowerCase();
    // Status filter uses JSON field inside settings.enterprise.status OR top-level status column fallback
    if (status) {
      // We'll fetch all then filter in-memory if status is stored in JSON enterprise settings
      where.status = undefined; // avoid accidental mismatch, use post-filter
    }
    if (!isPlatformAdmin(user?.role)) {
      if (user?.super_admin_id) where.super_admin_id = user.super_admin_id;
    }
    const clientsRaw = await prisma.client.findMany({ where, orderBy: { created_at: 'desc' } });
    const clients = clientsRaw.filter((c: any) => {
      if (!status) return true;
      const s1 = c.status || '';
      const s2 = c.settings?.enterprise?.status || '';
      return s1 === status || s2 === status;
    });
    const filtered = q ? clients.filter((c: any) => {
      const name = (c.name || '').toLowerCase();
      const legal = (c.settings?.enterprise?.legal_name || '').toLowerCase();
      const trade = (c.settings?.enterprise?.trade_name || '').toLowerCase();
      return name.includes(q) || legal.includes(q) || trade.includes(q);
    }) : clients;
    res.json({ success: true, count: filtered.length, data: filtered });
  } catch (e: any) {
    console.error('List clients error', e);
    res.status(500).json({ error: 'Failed to list clients', details: e.message });
  }
});

// Create client (tenant owner or platform)
// Helper: server-side client-id-service integration (returns string or null)
async function fetchServerClientId(country?: string): Promise<string | null> {
  const base = process.env.CLIENT_ID_SERVICE_URL;
  if (!base) return null;
  try {
    const body: any = { region: country || undefined, format: 'uuid', signed: false };
    const headers: any = { 'Content-Type': 'application/json' };
    if (process.env.CLIENT_ID_SERVICE_KEY) headers['x-api-key'] = process.env.CLIENT_ID_SERVICE_KEY;
    const resp = await fetch(`${base.replace(/\/$/, '')}/api/client-ids`, { method: 'POST', headers, body: JSON.stringify(body) });
    if (!resp.ok) {
      console.warn('client-id-service responded non-200', resp.status);
      return null;
    }
  const json: any = await resp.json().catch(() => ({}));
  return typeof json.client_id === 'string' ? json.client_id : null;
  } catch (e) {
    console.warn('client-id-service fetch failed', (e as any)?.message || e);
    return null;
  }
}

// Public code generator using ClientSequence model (per client_type + year)
async function generatePublicCode(clientType: string): Promise<{ public_code: string; client_number: bigint }> {
  const year = new Date().getUTCFullYear();
  const ct = clientType.toLowerCase();
  const seq = await (prisma as any).clientSequence.upsert({
    where: { client_type_year: { client_type: ct, year } },
    update: { last_number: { increment: 1 } },
    create: { client_type: ct, year, last_number: 1 },
  });
  const num: bigint = seq.last_number;
  const padded = num.toString().padStart(6, '0');
  const prefixMap: Record<string, string> = { trial: 'TRIAL', temporary: 'TRIAL', free: 'FREE', paid: 'PAID', enterprise: 'ENT', company: 'CLT' };
  const prefix = prefixMap[ct] || 'CLT';
  return { public_code: `${prefix}-${year}-${padded}`, client_number: num };
}

// Get single client (basic details + enterprise settings unpack)
router.get('/clients/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { id } = req.params;
    const clientId = String(id);
    const existing = await prisma.client.findUnique({ where: { id: clientId } });
    if (!existing) return res.status(404).json({ error: 'Client not found' });
    // Authorization: same as update rules
    const role = user?.role;
    const allowed = isPlatformAdmin(role) || isTenantAdmin(role) || role === 'SUPER_ADMIN' || role === 'ADMIN';
    if (!allowed || (!isPlatformAdmin(role) && user?.super_admin_id !== existing.super_admin_id)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    res.json({ success: true, data: existing });
  } catch (e: any) {
    console.error('Get client error', e);
    res.status(500).json({ error: 'Failed to get client', details: e.message });
  }
});

// Create client (tenant owner or platform) with optional server-side client-id-service persistence
router.post('/clients', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const role = user?.role;
    const isAllowed = isPlatformAdmin(role) || isTenantAdmin(role) || role === 'SUPER_ADMIN' || role === 'ADMIN';
    if (!isAllowed) return res.status(403).json({ error: 'Admin only' });

    const {
      name,
      productType = 'BUSINESS_ERP',
      subscriptionPlan = 'free',
      super_admin_id,
      saveAsDraft,
      adminUser,
      ensurePermissions,
      defaultViewAll,
      client_code: clientCodeFromBody,
      legal_name,
      trade_name,
      client_type,
      industry,
      business_size,
      registration_number,
      tax_id,
      legal_status,
      import_export_code,
      registration_year,
      primary_address,
      secondary_addresses,
      primary_contact,
      secondary_contact,
      financial_details,
      bank_details,
      documents,
      system_access,
      operational,
      risk,
      status,
  // Extended meta fields (flatted by frontend as body.meta or top-level)
  meta,
  segment,
  tier,
  lifecycle_stage,
  source_channel,
  tags,
  sales_team,
  external_reference,
  public_code,
  type_sequence_code,
  kyc_documents,
  kyc_status,
  risk_score,
    } = (req.body || {}) as any;

    // --- Duplicate Detection & Validation ---
    const normName = (name || legal_name || trade_name || '').trim().toLowerCase();
    const normTax = (tax_id || '').trim().toUpperCase();
    if (normTax && !/^[A-Z0-9]{10,15}$/.test(normTax)) {
      return res.status(400).json({ error: 'invalid_tax_id_format' });
    }
    // Query potential duplicates by legal_name/trade_name/tax_id
        // Note: legal_name/trade_name/tax_id are stored inside settings.enterprise JSON, so select settings
        const rawDuplicates = await prisma.client.findMany({
          where: {
            OR: [
              normName ? { settings: { contains: { enterprise: { legal_name } } } } : undefined,
              normName ? { settings: { contains: { enterprise: { trade_name } } } } : undefined,
              normTax ? { settings: { contains: { enterprise: { tax_id: normTax } } } } : undefined,
            ].filter(Boolean) as any,
          },
          take: 5,
          select: { id: true, settings: true }
        }).catch(() => []);
    
        // Normalize results to a shape expected by downstream code (id, legal_name, trade_name, tax_id, status)
        const duplicates = (rawDuplicates || []).map((r: any) => {
          const ent = (r.settings && (r.settings.enterprise || r.settings)) || {};
          return {
            id: r.id,
            legal_name: ent.legal_name || null,
            trade_name: ent.trade_name || null,
            tax_id: ent.tax_id || null,
            status: ent.status || null,
          };
        });
    
        if (duplicates && duplicates.length > 0) {
          // Return structured duplicate info (not blocking create unless exact critical match)
          const exactTax = normTax && duplicates.find(d => (d.tax_id || '').toUpperCase() === normTax);
          if (exactTax) {
            return res.status(409).json({ error: 'duplicate_tax_id', duplicates });
          }
          // Soft warning via header; proceed but include list
          res.setHeader('X-Duplicate-Warning', 'similar_client_detected');
        }

    if (!name && !legal_name && !trade_name) return res.status(400).json({ error: 'name or legal_name/trade_name required' });
    let sid = super_admin_id || user?.super_admin_id;
    if (!sid) {
      try {
        if ((role === 'SUPER_ADMIN' || isTenantAdmin(role)) && user?.email) {
          const sa = await prisma.superAdmin.findUnique({ where: { email: user.email } });
          if (sa?.id) sid = sa.id;
        }
        if (!sid && user?.email) {
          const u = await prisma.user.findUnique({ where: { email: user.email } }).catch(() => null);
          if (u?.super_admin_id) sid = u.super_admin_id;
        }
        if (!sid && (user?.id || (user as any)?.userId)) {
          const uid = user?.id ?? (user as any)?.userId;
          const u = await prisma.user.findUnique({ where: { id: Number(uid) } }).catch(() => null);
          if (u?.super_admin_id) sid = u.super_admin_id;
        }
        if (!sid && user?.username) {
          const u = await prisma.user.findFirst({ where: { username: user.username } }).catch(() => null);
          if (u?.super_admin_id) sid = u.super_admin_id;
        }
        if (!sid) {
          const count = await prisma.superAdmin.count();
          if (count === 1) {
            const only = await prisma.superAdmin.findFirst();
            if (only?.id) sid = only.id;
          }
        }
      } catch {}
    }
    if (!sid) return res.status(400).json({ error: 'super_admin_id missing' });

    // Produce client_code: prefer body, else server-side generated, else fallback UUID
    let effectiveClientCode: string | undefined = clientCodeFromBody;
    if (!effectiveClientCode) {
      const generated = await fetchServerClientId(primary_address?.country);
      effectiveClientCode = generated || require('crypto').randomUUID();
    }

  const enterprise = {
      client_code: effectiveClientCode,
      legal_name,
      trade_name,
      client_type,
      industry,
      business_size,
      registration_number,
      tax_id,
      legal_status,
      import_export_code,
      registration_year,
      addresses: (() => {
        const arr: any[] = [];
        if (primary_address && typeof primary_address === 'object') arr.push({ type: primary_address.type || 'registered', ...primary_address });
        if (Array.isArray(secondary_addresses)) arr.push(...secondary_addresses);
        return arr;
      })(),
      contacts: (() => {
        const arr: any[] = [];
        if (primary_contact && (primary_contact.name || primary_contact.email)) arr.push({ ...primary_contact, primary: true });
        if (secondary_contact && (secondary_contact.name || secondary_contact.email)) arr.push({ ...secondary_contact, primary: false });
        return arr;
      })(),
      financial_details,
      bank_details,
      documents,
      system_access,
      operational,
      risk,
  status: status || 'Active',
      meta: {
        server_generated_code: !clientCodeFromBody,
        ...(meta || {}),
        segment: segment ?? meta?.segment,
        tier: tier ?? meta?.tier,
        lifecycle_stage: lifecycle_stage ?? meta?.lifecycle_stage,
        source_channel: source_channel ?? meta?.source_channel,
        tags: Array.isArray(tags) ? tags : (Array.isArray(meta?.tags) ? meta.tags : []),
        sales_team: Array.isArray(sales_team) ? sales_team : (Array.isArray(meta?.sales_team) ? meta.sales_team : []),
        external_reference: external_reference ?? meta?.external_reference,
        public_code: public_code ?? meta?.public_code,
        type_sequence_code: type_sequence_code ?? meta?.type_sequence_code,
        kyc_status: kyc_status ?? meta?.kyc_status,
        risk_score: typeof risk_score === 'number' ? risk_score : (typeof meta?.risk_score === 'number' ? meta.risk_score : undefined),
        kyc_documents: Array.isArray(kyc_documents) ? kyc_documents : (Array.isArray(meta?.kyc_documents) ? meta.kyc_documents : []),
        duplicate_check: {
          input: { legal_name, trade_name, tax_id: normTax || null },
          matches: duplicates?.map(d => ({ id: d.id, legal_name: d.legal_name, trade_name: d.trade_name, tax_id: d.tax_id, status: d.status })) || [],
          exact_tax_conflict: !!(normTax && duplicates.find(d => (d.tax_id || '').toUpperCase() === normTax)),
          timestamp: new Date().toISOString()
        }
      }
    };

    let created: any;
    // Generate public_code/client_number for full create (store inside enterprise.meta)
    let publicCodeData: { public_code: string; client_number: bigint } | null = null;
    try { publicCodeData = await generatePublicCode((client_type || 'company').toString()); } catch (e) { console.warn('Public code gen failed', (e as any)?.message); }
    if (publicCodeData) {
      (enterprise as any).meta = { ...(enterprise as any).meta, public_code: publicCodeData.public_code, client_number: publicCodeData.client_number };
    }
    if (adminUser || ensurePermissions) {
      await prisma.$transaction(async (tx) => {
        created = await tx.client.create({
          data: {
            name: name || legal_name || trade_name,
            productType,
            subscriptionPlan,
            super_admin_id: sid,
            settings: { enterprise } as any,
          },
        });
        if (ensurePermissions) {
          const modules = await tx.module.findMany({ where: { is_active: true } });
          for (const m of modules) {
            await (tx as any).clientModulePermission.upsert({
              where: { client_id_module_id: { client_id: created.id, module_id: m.id } },
              update: { can_view: defaultViewAll ? true : false },
              create: { client_id: created.id, module_id: m.id, can_view: !!defaultViewAll, can_create: false, can_edit: false, can_delete: false },
            });
          }
        }
      });
  } else {
      created = await prisma.client.create({
        data: {
          name: name || legal_name || trade_name,
          productType,
          subscriptionPlan,
          super_admin_id: sid,
          settings: { enterprise } as any,
        },
      });
    }

    if (saveAsDraft && !adminUser) {
      created = await prisma.client.update({
        where: { id: created.id },
        data: {
          is_active: false,
          settings: { enterprise: { ...enterprise, status: 'Draft' } } as any,
        },
      });
    }

    let adminCreated: any = null;
    let generatedPassword: string | undefined;
    if (adminUser && adminUser.email) {
      const existingUser = await prisma.user.findUnique({ where: { email: adminUser.email } }).catch(() => null);
      if (existingUser) {
        return res.status(409).json({ error: 'Admin email already exists', client: created });
      }
      const bcrypt = require('bcryptjs');
      const password = adminUser.password || generateTempPassword(12);
      generatedPassword = adminUser.password ? undefined : password;
      const hashed = await bcrypt.hash(password, 10);
      const emailPrefix = (adminUser.email && adminUser.email.split('@')[0]) || 'admin';
      const username = adminUser.username || emailPrefix;
      adminCreated = await prisma.user.create({
        data: {
          username,
          email: adminUser.email,
          password: hashed,
          role: 'ADMIN',
          is_active: true,
          productType,
          tenant_id: created.id,
          super_admin_id: sid,
          profile_pic_url: adminUser.profile_pic_url || null,
        },
      });
    }
  // Include effectiveClientCode separately for frontend even if underlying schema auto-populated differently.
  res.status(201).json({ success: true, client_code: effectiveClientCode, public_code: (enterprise as any).meta?.public_code, data: created, admin: adminCreated ? { id: adminCreated.id, email: adminCreated.email, username: adminCreated.username } : null, tempPassword: generatedPassword });
  } catch (e: any) {
    console.error('Create client error', e);
    // Handle unique constraint on client_code gracefully
    if (e.code === 'P2002' && e.meta?.target?.includes('client_code')) {
      return res.status(409).json({ error: 'Client code already exists (race condition). Retry.' });
    }
    res.status(500).json({ error: 'Failed to create client', details: e.message });
  }
});

// Update a client (partial), focusing on settings.enterprise JSON merge
router.patch('/clients/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { id } = req.params;
    const clientId = String(id);
    const existing = await prisma.client.findUnique({ where: { id: clientId } });
    if (!existing) return res.status(404).json({ error: 'Client not found' });
    const role = user?.role;
    const allowed = isPlatformAdmin(role) || isTenantAdmin(role) || role === 'SUPER_ADMIN' || role === 'ADMIN';
    if (!allowed || (!isPlatformAdmin(role) && user?.super_admin_id !== existing.super_admin_id)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const b: any = req.body || {};
    const e0: any = (existing as any).settings?.enterprise || {};
    const enterprise = {
      ...e0,
      client_code: b.client_code ?? e0.client_code,
      legal_name: b.legal_name ?? e0.legal_name,
      trade_name: b.trade_name ?? e0.trade_name,
      client_type: b.client_type ?? e0.client_type,
      industry: b.industry ?? e0.industry,
      business_size: b.business_size ?? e0.business_size,
      registration_number: b.registration_number ?? e0.registration_number,
      tax_id: b.tax_id ?? e0.tax_id,
      legal_status: b.legal_status ?? e0.legal_status,
      import_export_code: b.import_export_code ?? e0.import_export_code,
      registration_year: b.registration_year ?? e0.registration_year,
      addresses: (() => {
        if (b.primary_address || b.secondary_addresses) {
          const arr: any[] = [];
          if (b.primary_address) arr.push({ type: b.primary_address.type || 'registered', ...b.primary_address });
          if (Array.isArray(b.secondary_addresses)) arr.push(...b.secondary_addresses);
          return arr;
        }
        return e0.addresses;
      })(),
      contacts: (() => {
        if (b.primary_contact || b.secondary_contact) {
          const arr: any[] = [];
          if (b.primary_contact) arr.push({ ...b.primary_contact, primary: true });
          if (b.secondary_contact) arr.push({ ...b.secondary_contact, primary: false });
          return arr;
        }
        return e0.contacts;
      })(),
      financial_details: b.financial_details ?? e0.financial_details,
      bank_details: b.bank_details ?? e0.bank_details,
      documents: b.documents ?? e0.documents,
      system_access: b.system_access ?? e0.system_access,
      operational: b.operational ?? e0.operational,
      risk: b.risk ?? e0.risk,
      status: b.status ?? e0.status,
    };

    const updated = await prisma.client.update({ where: { id: clientId }, data: { settings: { enterprise } as any } });
    res.json({ success: true, data: updated });
  } catch (e: any) {
    console.error('Update client error', e);
    res.status(500).json({ error: 'Failed to update client', details: e.message });
  }
});

// Get module permissions for a client
// Optional query param: ?ensure=true will create missing permission rows for all active modules with all flags false
router.get('/clients/:id/permissions', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
  const { id } = req.params;
  const clientId = String(id);
    const ensure = String(req.query.ensure || '').toLowerCase() === 'true';
    // Access control: platform or tenant admin with matching client
  const client = await prisma.client.findUnique({ where: { id: clientId } });
    if (!client) return res.status(404).json({ error: 'Client not found' });
    if (!isPlatformAdmin(user?.role) && user?.super_admin_id !== client.super_admin_id) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    // Optionally ensure a permission row exists for every active module
    if (ensure) {
      const modules = await prisma.module.findMany({ where: { is_active: true } });
      for (const m of modules) {
  await prismaAny.clientModulePermission.upsert({
          where: { client_id_module_id: { client_id: clientId, module_id: m.id } },
          update: {},
          create: { client_id: clientId, module_id: m.id, can_view: false, can_create: false, can_edit: false, can_delete: false }
        });
      }
    }
  const permissions = await prismaAny.clientModulePermission.findMany({
      where: { client_id: clientId },
      include: { module: true },
      orderBy: { module_id: 'asc' },
    });
    res.json({ success: true, data: permissions });
  } catch (e: any) {
    console.error('Get client permissions error', e);
    res.status(500).json({ error: 'Failed to fetch permissions', details: e.message });
  }
});

// Update module permission override
router.put('/clients/:id/permissions/:moduleId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { id, moduleId } = req.params;
  const clientId = String(id);
    const modId = Number(moduleId);
    const client = await prisma.client.findUnique({ where: { id: clientId } });
    if (!client) return res.status(404).json({ error: 'Client not found' });
    if (!isTenantAdmin(user?.role) || (!isPlatformAdmin(user?.role) && user?.super_admin_id !== client.super_admin_id)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const { can_view, can_create, can_edit, can_delete } = req.body;
  const updated = await prismaAny.clientModulePermission.upsert({
      where: { client_id_module_id: { client_id: clientId, module_id: modId } },
      update: { can_view, can_create, can_edit, can_delete },
      create: { client_id: clientId, module_id: modId, can_view: !!can_view, can_create: !!can_create, can_edit: !!can_edit, can_delete: !!can_delete },
    });
    res.json({ success: true, data: updated });
  } catch (e: any) {
    console.error('Update client permission error', e);
    res.status(500).json({ error: 'Failed to update permission', details: e.message });
  }
});

// Bulk update module permissions
// POST body: { items: [{ module_id: number, can_view?: boolean, can_create?: boolean, can_edit?: boolean, can_delete?: boolean }, ...] }
// Returns array of upserted permission rows
router.post('/clients/:id/permissions/bulk', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { id } = req.params;
  const clientId = String(id);
    const client = await prisma.client.findUnique({ where: { id: clientId } });
    if (!client) return res.status(404).json({ error: 'Client not found' });
    if (!isTenantAdmin(user?.role) || (!isPlatformAdmin(user?.role) && user?.super_admin_id !== client.super_admin_id)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const items: Array<{ module_id: number; can_view?: boolean; can_create?: boolean; can_edit?: boolean; can_delete?: boolean }> = req.body?.items || [];
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'items array required' });
    }
    const ops = items
      .filter((it) => it && typeof it.module_id === 'number')
      .map((it) =>
        prismaAny.clientModulePermission.upsert({
          where: { client_id_module_id: { client_id: clientId, module_id: it.module_id } },
          update: {
            can_view: it.can_view,
            can_create: it.can_create,
            can_edit: it.can_edit,
            can_delete: it.can_delete,
          },
          create: {
            client_id: clientId,
            module_id: it.module_id,
            can_view: !!it.can_view,
            can_create: !!it.can_create,
            can_edit: !!it.can_edit,
            can_delete: !!it.can_delete,
          },
        })
      );
    const results = await prismaAny.$transaction(ops);
    res.json({ success: true, count: results.length, data: results });
  } catch (e: any) {
    console.error('Bulk update permissions error', e);
    res.status(500).json({ error: 'Failed bulk update', details: e.message });
  }
});

// Enable/Disable a client (soft)
router.patch('/clients/:id/active', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { id } = req.params;
    const clientId = String(id);
    const { is_active } = req.body || {};
    if (typeof is_active !== 'boolean') {
      return res.status(400).json({ error: 'is_active boolean required' });
    }
    const client = await prisma.client.findUnique({ where: { id: clientId } });
    if (!client) return res.status(404).json({ error: 'Client not found' });
    // Only platform admin or tenant admin for the owning super_admin can change status
    if (!isTenantAdmin(user?.role) || (!isPlatformAdmin(user?.role) && user?.super_admin_id !== client.super_admin_id)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const updated = await prisma.client.update({ where: { id: clientId }, data: { is_active } });
    res.json({ success: true, data: updated });
  } catch (e: any) {
    console.error('Toggle client active error', e);
    res.status(500).json({ error: 'Failed to update client status', details: e.message });
  }
});

// Daily usage metrics for a client
router.get('/clients/:id/usage/daily', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
  const { id } = req.params;
  const clientId = String(id);
  const client = await prisma.client.findUnique({ where: { id: clientId } });
    if (!client) return res.status(404).json({ error: 'Client not found' });
    if (!isPlatformAdmin(user?.role) && user?.super_admin_id !== client.super_admin_id) {
      return res.status(403).json({ error: 'Forbidden' });
    }
  const usage = await prismaAny.clientDailyUsage.findMany({ where: { client_id: clientId }, orderBy: { date: 'desc' }, take: 30 });
    res.json({ success: true, data: usage });
  } catch (e: any) {
    console.error('Get client daily usage error', e);
    res.status(500).json({ error: 'Failed to fetch usage', details: e.message });
  }
});

export default router;

// --- Documents Management (append metadata into enterprise.documents array) ---
router.post('/clients/:id/documents', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { id } = req.params;
    const clientId = String(id);
    const client = await prisma.client.findUnique({ where: { id: clientId } });
    if (!client) return res.status(404).json({ error: 'Client not found' });
    const role = user?.role;
    const allowed = isPlatformAdmin(role) || isTenantAdmin(role) || role === 'SUPER_ADMIN' || role === 'ADMIN';
    if (!allowed || (!isPlatformAdmin(role) && user?.super_admin_id !== client.super_admin_id)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const { filename, url, size_bytes, content_type, doc_type } = req.body || {};
    if (!filename || !url) return res.status(400).json({ error: 'filename and url required' });
    const settings: any = client.settings || {};
    const enterprise: any = settings.enterprise || {};
    const docs: any[] = Array.isArray(enterprise.documents) ? enterprise.documents.slice() : [];
    const meta = {
      id: require('crypto').randomUUID(),
      filename,
      url,
      size_bytes: size_bytes || null,
      content_type: content_type || null,
      doc_type: doc_type || 'GENERAL',
      uploaded_at: new Date().toISOString(),
      uploaded_by: user?.email || user?.username || null,
    };
    docs.push(meta);
    enterprise.documents = docs;
    const updated = await prisma.client.update({ where: { id: clientId }, data: { settings: { enterprise } as any } });
    res.status(201).json({ success: true, data: meta, count: docs.length });
  } catch (e: any) {
    console.error('Add client document error', e);
    res.status(500).json({ error: 'Failed to add document', details: e.message });
  }
});

// Public temporary client registration (minimal onboarding) - no auth required
// Creates a client with status 'Temporary' and is_active=false
router.post('/public/clients/register', async (req: Request, res: Response) => {
  try {
    const { legal_name, trade_name, email, phone, country } = req.body || {};
    if (!legal_name && !trade_name) return res.status(400).json({ error: 'legal_name or trade_name required' });
    // Resolve a default super_admin_id: choose single SuperAdmin if only one exists
    let sid: number | undefined;
    try {
      const count = await prisma.superAdmin.count();
      if (count === 1) {
        const only = await prisma.superAdmin.findFirst();
        if (only?.id) sid = only.id;
      }
    } catch {}
    if (!sid) return res.status(503).json({ error: 'super_admin_id unavailable for temporary registration' });
    const clientCode = await fetchServerClientId(country) || require('crypto').randomUUID();
  const enterprise: any = {
      legal_name,
      trade_name,
      status: 'trial',
      contacts: email || phone ? [{ name: legal_name || trade_name || 'Trial', email, phone, primary: true }] : [],
      addresses: country ? [{ type: 'registered', country }] : [],
    };
  let publicCodeData: { public_code: string; client_number: bigint } | null = null;
  try { publicCodeData = await generatePublicCode('trial'); } catch (e) { console.warn('Public code gen failed (trial)', (e as any)?.message); }
  if (publicCodeData) enterprise.meta = { ...(enterprise.meta || {}), public_code: publicCodeData.public_code, client_number: publicCodeData.client_number };
    const created = await prisma.client.create({
      data: {
        name: legal_name || trade_name,
        productType: 'BUSINESS_ERP',
        subscriptionPlan: 'free',
        super_admin_id: sid,
        is_active: false,
        // client_code field may be absent in Prisma model; included in enterprise JSON only.
        settings: { enterprise: { ...enterprise, client_code: clientCode } } as any,
    // Store public code only inside enterprise meta until migration applied
      },
    });
  res.status(201).json({ success: true, data: { id: created.id, client_code: clientCode, public_code: enterprise.meta?.public_code, status: 'trial' } });
  } catch (e: any) {
    console.error('Temporary registration error', e);
    res.status(500).json({ error: 'Failed temporary registration', details: e.message });
  }
});

// Promote temporary client to active
router.post('/clients/:id/promote', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { id } = req.params;
    const clientId = String(id);
    const client = await prisma.client.findUnique({ where: { id: clientId } });
    if (!client) return res.status(404).json({ error: 'Client not found' });
    const role = user?.role;
    const allowed = isPlatformAdmin(role) || isTenantAdmin(role) || role === 'SUPER_ADMIN' || role === 'ADMIN';
    if (!allowed || (!isPlatformAdmin(role) && user?.super_admin_id !== client.super_admin_id)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    // Update status inside enterprise settings
    let enterprise: any = {};
    try {
      const raw: any = client.settings;
      // settings may be an object with enterprise key or already structured; handle both.
      if (raw && typeof raw === 'object') {
        enterprise = (raw as any).enterprise || raw;
      }
    } catch {}
    enterprise.status = 'active';
    let publicCodeData: { public_code: string; client_number: bigint } | null = null;
    // Generate only if not already in enterprise meta
    const existingPublic = enterprise.meta?.public_code;
    if (!existingPublic) {
      try { publicCodeData = await generatePublicCode('paid'); } catch (e) { console.warn('Public code gen failed (promote)', (e as any)?.message); }
      if (publicCodeData) enterprise.meta = { ...(enterprise.meta || {}), public_code: publicCodeData.public_code, client_number: publicCodeData.client_number };
    }
    const updated = await prisma.client.update({
      where: { id: clientId },
      data: { is_active: true, settings: { enterprise } as any },
    });
    res.json({ success: true, data: { id: updated.id, status: 'active', public_code: enterprise.meta?.public_code } });
  } catch (e: any) {
    console.error('Promote client error', e);
    res.status(500).json({ error: 'Failed to promote client', details: e.message });
  }
});

// --- Onboarding activity logging for registered wizard ---
router.post('/clients/:id/onboarding/activity', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { id } = req.params; const clientId = String(id);
    const client = await prisma.client.findUnique({ where: { id: clientId } });
    if (!client) return res.status(404).json({ error: 'Client not found' });
    const role = user?.role;
    const allowed = isPlatformAdmin(role) || isTenantAdmin(role) || role === 'SUPER_ADMIN' || role === 'ADMIN';
    if (!allowed || (!isPlatformAdmin(role) && user?.super_admin_id !== client.super_admin_id)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const { step_key, action, meta } = req.body || {};
    if (!step_key || !action) return res.status(400).json({ error: 'step_key and action required' });
  const created = await (prismaAny as any).clientOnboardingActivity.create({ data: { client_id: clientId, step_key, action, meta, actor_email: user?.email || undefined } });
  // Recent activity retrieval (not cached since field not yet migrated)
  const recent = await (prismaAny as any).clientOnboardingActivity.findMany({ where: { client_id: clientId }, orderBy: { created_at: 'desc' }, take: 5 });
    res.status(201).json({ success: true, data: created });
  } catch (e: any) {
    console.error('Onboarding activity error', e);
    res.status(500).json({ error: 'Failed to log activity', details: e.message });
  }
});

// Autosave partial onboarding draft (stores subset fields + updates onboarding_status)
router.patch('/clients/:id/onboarding/draft', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { id } = req.params; const clientId = String(id);
    const client = await prisma.client.findUnique({ where: { id: clientId } });
    if (!client) return res.status(404).json({ error: 'Client not found' });
    const role = user?.role;
    const allowed = isPlatformAdmin(role) || isTenantAdmin(role) || role === 'SUPER_ADMIN' || role === 'ADMIN';
    if (!allowed || (!isPlatformAdmin(role) && user?.super_admin_id !== client.super_admin_id)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const { state, step_key } = req.body || {};
    // Merge minimal fields (legal_name, trade_name, tax_id) if present
    const patch: any = {};
    if (state?.identification?.legal_name) patch.legal_name = state.identification.legal_name;
    if (state?.identification?.trade_name) patch.trade_name = state.identification.trade_name;
    if (state?.identification?.tax_id) patch.tax_id = state.identification.tax_id;
    patch.onboarding_status = 'in_progress';
  const updated = await prisma.client.update({ where: { id: clientId }, data: patch });
    // log activity
  try { await (prismaAny as any).clientOnboardingActivity.create({ data: { client_id: clientId, step_key: step_key || 'unknown', action: 'autosaved', meta: { fields: Object.keys(patch) }, actor_email: user?.email || undefined } }); } catch {}
  res.json({ success: true, data: { id: updated.id } });
  } catch (e: any) {
    console.error('Onboarding draft autosave error', e);
    res.status(500).json({ error: 'Failed to autosave draft', details: e.message });
  }
});

// Delete client (soft by default). Soft: set is_active=false and enterprise.meta.deleted_at timestamp.
// Hard delete with query param ?hard=true
router.delete('/clients/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { id } = req.params;
    const clientId = String(id);
    const hard = String(req.query.hard || '').toLowerCase() === 'true';
    const existing: any = await prisma.client.findUnique({ where: { id: clientId } });
    if (!existing) return res.status(404).json({ error: 'Client not found' });
    const role = user?.role;
    const allowed = isPlatformAdmin(role) || isTenantAdmin(role) || role === 'SUPER_ADMIN';
    if (!allowed || (!isPlatformAdmin(role) && user?.super_admin_id !== existing.super_admin_id)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    if (hard) {
      await prisma.client.delete({ where: { id: clientId } });
      return res.json({ success: true, hard: true, id: clientId });
    }
    const settings: any = existing.settings || {}; const enterprise: any = settings.enterprise || settings;
    enterprise.meta = { ...(enterprise.meta || {}), deleted_at: new Date().toISOString() };
    const updated = await prisma.client.update({ where: { id: clientId }, data: { is_active: false, settings: { enterprise } as any } });
    res.json({ success: true, hard: false, id: clientId, deleted_at: enterprise.meta.deleted_at });
  } catch (e: any) {
    console.error('Delete client error', e);
    res.status(500).json({ error: 'Failed to delete client', details: e.message });
  }
});
