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
    if (!isPlatformAdmin(user?.role)) {
      // limit to clients under the user's super_admin_id if present
      if (user?.super_admin_id) where.super_admin_id = user.super_admin_id;
    }
    const clients = await prisma.client.findMany({ where, orderBy: { created_at: 'desc' } });
    res.json({ success: true, data: clients });
  } catch (e: any) {
    console.error('List clients error', e);
    res.status(500).json({ error: 'Failed to list clients', details: e.message });
  }
});

// Create client (tenant owner or platform)
router.post('/clients', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    // Permit platform admin, tenant admin, and super admin roles to create clients
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
      // Enterprise fields (packed under settings.enterprise)
      client_code,
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
    } = (req.body || {}) as any;

    if (!name && !legal_name && !trade_name) return res.status(400).json({ error: 'name or legal_name/trade_name required' });
    let sid = super_admin_id || user?.super_admin_id;
    // Robust fallback resolution for super_admin_id
    if (!sid) {
      try {
        // 1) If SUPER_ADMIN (or tenant admin), try SuperAdmin by email
        if ((role === 'SUPER_ADMIN' || isTenantAdmin(role)) && user?.email) {
          const sa = await prisma.superAdmin.findUnique({ where: { email: user.email } });
          if (sa?.id) sid = sa.id;
        }
        // 2) If still not found, try Users table by email
        if (!sid && user?.email) {
          const u = await prisma.user.findUnique({ where: { email: user.email } }).catch(() => null);
          if (u?.super_admin_id) sid = u.super_admin_id;
        }
        // 3) Try Users table by id (id or userId)
        if (!sid && (user?.id || (user as any)?.userId)) {
          const uid = user?.id ?? (user as any)?.userId;
          const u = await prisma.user.findUnique({ where: { id: Number(uid) } }).catch(() => null);
          if (u?.super_admin_id) sid = u.super_admin_id;
        }
        // 4) Try Users table by username if available
        if (!sid && user?.username) {
          const u = await prisma.user.findFirst({ where: { username: user.username } }).catch(() => null);
          if (u?.super_admin_id) sid = u.super_admin_id;
        }
        // 5) Dev-friendly fallback: if exactly one SuperAdmin exists, use it
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

    const enterprise = {
      client_code,
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
      status,
    };

    // Create client first (optionally inside a transaction when we also provision admin/permissions)
    let created: any;
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

    // If saveAsDraft requested (and no admin yet), mark inactive/draft
    if (saveAsDraft && !adminUser) {
      created = await prisma.client.update({
        where: { id: created.id },
        data: {
          is_active: false,
          // Persist draft status inside enterprise JSON to avoid schema drift issues
          settings: { enterprise: { ...enterprise, status: 'Draft' } } as any,
        },
      });
    }

    // Optionally create a default Admin user for this client
    let adminCreated: any = null;
    let generatedPassword: string | undefined;
    if (adminUser && adminUser.email) {
      // Validate uniqueness by email
      const existingUser = await prisma.user.findUnique({ where: { email: adminUser.email } }).catch(() => null);
      if (existingUser) {
        // Roll back client if it was created just now? Safer to keep client and report conflict.
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
    res.status(201).json({ success: true, data: created, admin: adminCreated ? { id: adminCreated.id, email: adminCreated.email, username: adminCreated.username } : null, tempPassword: generatedPassword });
  } catch (e: any) {
    console.error('Create client error', e);
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
