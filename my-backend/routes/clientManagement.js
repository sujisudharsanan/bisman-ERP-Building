const { Router } = require('express');
const { authMiddleware } = require('../middleware/auth');
const { getPrisma } = require('../lib/prisma');

const router = Router();
// Use shared Prisma singleton; may be null if DB not available
const prisma = getPrisma();

function isPlatformAdmin(role) { return role === 'SYSTEM_ADMIN'; }
function isTenantAdmin(role) { return role === 'ADMIN' || role === 'SYSTEM_ADMIN'; }

router.post('/super-admins', authMiddleware, async (req, res) => {
  try {
    const user = req.user;
    if (!isPlatformAdmin(user?.role)) return res.status(403).json({ error: 'Platform admin only' });
    const { name, email, password, productType = 'BUSINESS_ERP', enterprise_admin_id = 1 } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'name, email, password required' });
    const exists = await prisma.superAdmin.findUnique({ where: { email } });
    if (exists) return res.status(400).json({ error: 'SuperAdmin email already exists' });
    const bcrypt = require('bcryptjs');
    const hashed = await bcrypt.hash(password, 10);
    const created = await prisma.superAdmin.create({ data: { name, email, password: hashed, productType, created_by: enterprise_admin_id } });
    res.status(201).json({ success: true, data: created });
  } catch (e) {
    res.status(500).json({ error: 'Failed to create SuperAdmin', details: e.message });
  }
});

router.get('/clients', authMiddleware, async (req, res) => {
  try {
    const user = req.user;
    const where = {};
    
    // For SUPER_ADMIN, use their own id to filter clients
    // For regular users, use super_admin_id from their user record
    if (!isPlatformAdmin(user?.role)) {
      if (user?.userType === 'SUPER_ADMIN' || user?.role === 'SUPER_ADMIN') {
        // SUPER_ADMIN - filter by their own id
        where.super_admin_id = user.id;
      } else if (user?.super_admin_id) {
        // Regular user - filter by their assigned super_admin_id
        where.super_admin_id = user.super_admin_id;
      }
    }
    
    console.log('[clients] User:', user?.id, 'Role:', user?.role, 'Filter:', where);

    if (!prisma) {
      // Database not available (dev mode fallback) — return empty list instead of 500
      return res.json({ success: true, count: 0, data: [] });
    }

    const clients = await prisma.client.findMany({ where, orderBy: { created_at: 'desc' } });
    console.log('[clients] Found', clients.length, 'clients');
    // Convert BigInt fields to strings for JSON serialization
    const serializedClients = clients.map(client => ({
      ...client,
      client_number: client.client_number ? client.client_number.toString() : null,
    }));
    res.json({ success: true, count: clients.length, data: serializedClients });
  } catch (e) {
    console.error('List clients error:', e?.message || e);
    // Graceful fallback: avoid blocking UI in dev if DB hiccups
    const isDev = process.env.NODE_ENV !== 'production';
    if (isDev) return res.json({ success: true, count: 0, data: [], warning: 'db_unavailable' });
    res.status(500).json({ error: 'Failed to list clients', details: e.message });
  }
});

router.post('/clients', authMiddleware, async (req, res) => {
  try {
    const user = req.user;
  const role = user?.role;
  const isAllowed = role === 'SYSTEM_ADMIN' || role === 'ADMIN' || role === 'SUPER_ADMIN';
  if (!isAllowed) return res.status(403).json({ error: 'Admin only' });
    const {
      name,
      productType = 'BUSINESS_ERP',
      subscriptionPlan = 'free',
      super_admin_id,
  saveAsDraft,
  adminUser,
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
    } = req.body || {};
  if (!name && !legal_name && !trade_name) return res.status(400).json({ error: 'client name (name or legal_name/trade_name) required' });
  const sid = super_admin_id || user?.super_admin_id;
    if (!sid) return res.status(400).json({ error: 'super_admin_id missing' });
    const enterprise = {
      client_code, legal_name, trade_name, client_type, industry, business_size,
      registration_number, tax_id, legal_status, import_export_code, registration_year,
      addresses: (()=>{
        const arr = [];
        if (primary_address && typeof primary_address === 'object') arr.push({ type: primary_address.type || 'registered', ...primary_address });
        if (Array.isArray(secondary_addresses)) arr.push(...secondary_addresses);
        return arr;
      })(),
      contacts: (()=>{
        const arr = [];
        if (primary_contact && (primary_contact.name || primary_contact.email)) arr.push({ ...primary_contact, primary: true });
        if (secondary_contact && (secondary_contact.name || secondary_contact.email)) arr.push({ ...secondary_contact, primary: false });
        return arr;
      })(),
      financial_details, bank_details, documents, system_access, operational, risk, status,
    };
    let created = await prisma.client.create({
      data: {
        name: name || legal_name || trade_name,
        productType,
        subscriptionPlan,
        super_admin_id: sid,
  settings: { enterprise }
      }
    });
    // Draft mode (no admin yet)
    if (saveAsDraft && !adminUser) {
      created = await prisma.client.update({ where: { id: created.id }, data: { is_active: false, status: 'Draft' } });
    }

    // Optionally create default admin for this client
    let adminCreated = null;
    let tempPassword;
    if (adminUser && adminUser.email) {
      try {
        const exists = await prisma.user.findUnique({ where: { email: adminUser.email } });
        if (exists) return res.status(409).json({ error: 'Admin email already exists', client: created });
      } catch {}
      const bcrypt = require('bcryptjs');
      const gen = (len = 12) => {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789@$!%*#?&';
        let out = '';
        for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
        return out;
      };
      const password = adminUser.password || gen(12);
      tempPassword = adminUser.password ? undefined : password;
      const hashed = await bcrypt.hash(password, 10);
      const username = adminUser.username || (adminUser.email?.split?.('@')?.[0] || `admin_${created.client_code || 'client'}`);
      adminCreated = await prisma.user.create({
        data: {
          username,
          email: adminUser.email,
          password_hash: hashed,
          role: 'ADMIN',
          is_active: true,
          productType,
          tenant_id: created.id,
          super_admin_id: sid,
          profile_pic_url: adminUser.profile_pic_url || null,
        },
      });
    }
    res.status(201).json({ success: true, data: created, admin: adminCreated ? { id: adminCreated.id, email: adminCreated.email, username: adminCreated.username } : null, tempPassword });
  } catch (e) { res.status(500).json({ error: 'Failed to create client', details: e.message }); }
});

// Fetch single client
router.get('/clients/:id', authMiddleware, async (req, res) => {
  try {
    const user = req.user;
    const clientId = String(req.params.id);
    const client = await prisma.client.findUnique({ where: { id: clientId } });
    if (!client) return res.status(404).json({ error: 'Client not found' });
    if (!isPlatformAdmin(user?.role) && user?.super_admin_id !== client.super_admin_id) return res.status(403).json({ error: 'Forbidden' });
    res.json({ success: true, data: client });
  } catch (e) { res.status(500).json({ error: 'Failed to fetch client', details: e.message }); }
});

// Update client (partial)
router.patch('/clients/:id', authMiddleware, async (req, res) => {
  try {
    const user = req.user;
    const clientId = String(req.params.id);
    const existing = await prisma.client.findUnique({ where: { id: clientId } });
    if (!existing) return res.status(404).json({ error: 'Client not found' });
    if (!isTenantAdmin(user?.role) || (!isPlatformAdmin(user?.role) && user?.super_admin_id !== existing.super_admin_id)) return res.status(403).json({ error: 'Forbidden' });
    const b = req.body || {};
    const e0 = (existing.settings && existing.settings.enterprise) ? existing.settings.enterprise : {};
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
      addresses: (()=>{
        if (b.primary_address || b.secondary_addresses) {
          const arr = [];
          if (b.primary_address) arr.push({ type: b.primary_address.type || 'registered', ...b.primary_address });
          if (Array.isArray(b.secondary_addresses)) arr.push(...b.secondary_addresses);
          return arr;
        }
        return e0.addresses;
      })(),
      contacts: (()=>{
        if (b.primary_contact || b.secondary_contact) {
          const arr = [];
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
    const updated = await prisma.client.update({ where: { id: clientId }, data: { settings: { enterprise } } });
    res.json({ success: true, data: updated });
  } catch (e) { res.status(500).json({ error: 'Failed to update client', details: e.message }); }
});

router.get('/clients/:id/permissions', authMiddleware, async (req, res) => {
  try {
    const user = req.user;
    const { id } = req.params;
    const clientId = String(id);
    const ensure = String(req.query.ensure || '').toLowerCase() === 'true';
    const client = await prisma.client.findUnique({ where: { id: clientId } });
    if (!client) return res.status(404).json({ error: 'Client not found' });
    if (!isPlatformAdmin(user?.role) && user?.super_admin_id !== client.super_admin_id) return res.status(403).json({ error: 'Forbidden' });
    // Optionally ensure permission row exists for every active module
    if (ensure) {
      const modules = await prisma.module.findMany({ where: { is_active: true } });
      for (const m of modules) {
        await prisma.clientModulePermission.upsert({
          where: { client_id_module_id: { client_id: clientId, module_id: m.id } },
          update: {},
          create: { client_id: clientId, module_id: m.id, can_view: false, can_create: false, can_edit: false, can_delete: false }
        });
      }
    }
    const permissions = await prisma.clientModulePermission.findMany({ where: { client_id: clientId }, include: { module: true }, orderBy: { module_id: 'asc' } });
    res.json({ success: true, data: permissions });
  } catch (e) { res.status(500).json({ error: 'Failed to fetch permissions', details: e.message }); }
});

router.put('/clients/:id/permissions/:moduleId', authMiddleware, async (req, res) => {
  try {
    const user = req.user;
    const { id, moduleId } = req.params;
    const clientId = String(id);
    const client = await prisma.client.findUnique({ where: { id: clientId } });
    if (!client) return res.status(404).json({ error: 'Client not found' });
    if (!isTenantAdmin(user?.role) || (!isPlatformAdmin(user?.role) && user?.super_admin_id !== client.super_admin_id)) return res.status(403).json({ error: 'Forbidden' });
    const { can_view, can_create, can_edit, can_delete } = req.body;
    const updated = await prisma.clientModulePermission.upsert({ where: { client_id_module_id: { client_id: clientId, module_id: Number(moduleId) } }, update: { can_view, can_create, can_edit, can_delete }, create: { client_id: clientId, module_id: Number(moduleId), can_view: !!can_view, can_create: !!can_create, can_edit: !!can_edit, can_delete: !!can_delete } });
    res.json({ success: true, data: updated });
  } catch (e) { res.status(500).json({ error: 'Failed to update permission', details: e.message }); }
});

// Bulk update module permissions for a client
// POST body: { items: [{ module_id: number, can_view?: boolean, can_create?: boolean, can_edit?: boolean, can_delete?: boolean }, ...] }
router.post('/clients/:id/permissions/bulk', authMiddleware, async (req, res) => {
  try {
    const user = req.user;
    const { id } = req.params;
    const clientId = String(id);
    const client = await prisma.client.findUnique({ where: { id: clientId } });
    if (!client) return res.status(404).json({ error: 'Client not found' });
    if (!isTenantAdmin(user?.role) || (!isPlatformAdmin(user?.role) && user?.super_admin_id !== client.super_admin_id)) return res.status(403).json({ error: 'Forbidden' });
    const items = Array.isArray(req.body?.items) ? req.body.items : [];
    if (items.length === 0) return res.status(400).json({ error: 'items array required' });
    const ops = items
      .filter((it) => it && typeof it.module_id === 'number')
      .map((it) =>
        prisma.clientModulePermission.upsert({
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
    const results = await prisma.$transaction(ops);
    res.json({ success: true, count: results.length, data: results });
  } catch (e) { res.status(500).json({ error: 'Failed bulk update', details: e.message }); }
});

// Enable/Disable a client (soft)
router.patch('/clients/:id/active', authMiddleware, async (req, res) => {
  try {
    const user = req.user;
    const { id } = req.params;
    const clientId = String(id);
    const { is_active } = req.body || {};
    if (typeof is_active !== 'boolean') {
      return res.status(400).json({ error: 'is_active boolean required' });
    }
    const client = await prisma.client.findUnique({ where: { id: clientId } });
    if (!client) return res.status(404).json({ error: 'Client not found' });
    if (!(user?.role === 'ADMIN' || user?.role === 'SYSTEM_ADMIN' || user?.role === 'SUPER_ADMIN') || (user?.role !== 'SYSTEM_ADMIN' && user?.super_admin_id !== client.super_admin_id)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const updated = await prisma.client.update({ where: { id: clientId }, data: { is_active } });
    res.json({ success: true, data: updated });
  } catch (e) {
    res.status(500).json({ error: 'Failed to update client status', details: e.message });
  }
});

router.get('/clients/:id/usage/daily', authMiddleware, async (req, res) => {
  try {
    const user = req.user;
  const { id } = req.params;
  const clientId = String(id);
  const client = await prisma.client.findUnique({ where: { id: clientId } });
    if (!client) return res.status(404).json({ error: 'Client not found' });
    if (!isPlatformAdmin(user?.role) && user?.super_admin_id !== client.super_admin_id) return res.status(403).json({ error: 'Forbidden' });
  const usage = await prisma.clientDailyUsage.findMany({ where: { client_id: clientId }, orderBy: { date: 'desc' }, take: 30 });
    res.json({ success: true, data: usage });
  } catch (e) { res.status(500).json({ error: 'Failed to fetch usage', details: e.message }); }
});

module.exports = router;
