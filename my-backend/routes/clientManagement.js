const { Router } = require('express');
const { authMiddleware } = require('../middleware/auth');
const { getPrisma } = require('../lib/prisma');
const { hasCrossTenantScope, hasTenantAdminScope } = require('../services/authorizationService');

const router = Router();
// Use shared Prisma singleton; may be null if DB not available
const prisma = getPrisma();

// DEPRECATED: Use hasCrossTenantScope/hasTenantAdminScope from authorizationService instead
// Keeping for backwards compatibility during migration
function isPlatformAdmin(role) { return role === 'SYSTEM_ADMIN'; }
function isTenantAdmin(role) { return role === 'ADMIN' || role === 'SYSTEM_ADMIN'; }

router.post('/super-admins', authMiddleware, async (req, res) => {
  try {
    const user = req.user;
    // Only CROSS_TENANT scope users can create super admins
    if (!hasCrossTenantScope(user)) return res.status(403).json({ error: 'Cross-tenant access required' });
    const { name, email, password, productType = 'BUSINESS_ERP', enterprise_admin_id = 1 } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'name, email, password required' });
    const exists = await prisma.super_admins.findUnique({ where: { email } });
    if (exists) return res.status(400).json({ error: 'SuperAdmin email already exists' });
    const bcrypt = require('bcryptjs');
    const hashed = await bcrypt.hash(password, 10);
    const created = await prisma.super_admins.create({ data: { name, email, password: hashed, productType, created_by: enterprise_admin_id } });
    res.status(201).json({ success: true, data: created });
  } catch (e) {
    res.status(500).json({ error: 'Failed to create SuperAdmin', details: e.message });
  }
});

router.get('/clients', authMiddleware, async (req, res) => {
  try {
    const user = req.user;
    const where = {};
    
    // Use system_scope for authorization:
    // - CROSS_TENANT: Can see all clients (no filter)
    // - TENANT: Filter by super_admin_id  
    // - BUSINESS: Filter by their assigned super_admin_id
    if (!hasCrossTenantScope(user)) {
      if (hasTenantAdminScope(user)) {
        // TENANT scope (ADMIN) - filter by their super_admin_id
        const superAdminId = typeof user.id === 'string' ? parseInt(user.id, 10) : user.id;
        if (!isNaN(superAdminId) && user.userType === 'SUPER_ADMIN') {
          where.super_admin_id = superAdminId;
        } else if (user?.super_admin_id) {
          const saId = typeof user.super_admin_id === 'string' ? parseInt(user.super_admin_id, 10) : user.super_admin_id;
          if (!isNaN(saId)) {
            where.super_admin_id = saId;
          }
        }
      } else if (user?.super_admin_id) {
        // BUSINESS scope - filter by their assigned super_admin_id
        const saId = typeof user.super_admin_id === 'string' ? parseInt(user.super_admin_id, 10) : user.super_admin_id;
        if (!isNaN(saId)) {
          where.super_admin_id = saId;
        }
      }
    }
    
    console.log('[clients] User:', user?.id, 'Role:', user?.role, 'UserType:', user?.userType, 'Filter:', where);

    if (!prisma) {
      // Database not available (dev mode fallback) — return empty list instead of 500
      return res.json({ success: true, count: 0, data: [] });
    }

    const clients = await prisma.clients.findMany({ where, orderBy: { created_at: 'desc' } });
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
  // Use scope-based authorization instead of role string checks
  const isAllowed = hasTenantAdminScope(user);
  if (!isAllowed) return res.status(403).json({ error: 'Tenant admin access required' });
    const {
      name,
      productType = 'BUSINESS_ERP',
      subscriptionPlan = 'none', // Default to 'none' - user must choose a plan
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
  const sid = super_admin_id || user?.super_admin_id || user?.id;
    if (!sid) return res.status(400).json({ error: 'super_admin_id missing' });
    // Ensure super_admin_id is an integer
    const parsedSid = typeof sid === 'string' ? parseInt(sid, 10) : sid;
    if (isNaN(parsedSid)) return res.status(400).json({ error: 'super_admin_id must be a valid number' });
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
    let created = await prisma.clients.create({
      data: {
        name: name || legal_name || trade_name,
        productType,
        subscriptionPlan,
        super_admin_id: parsedSid,
  settings: { enterprise }
      }
    });
    // Draft mode (no admin yet)
    if (saveAsDraft && !adminUser) {
      created = await prisma.clients.update({ where: { id: created.id }, data: { is_active: false, status: 'Draft' } });
    }

    // Optionally create default admin for this client
    let adminCreated = null;
    let tempPassword;
    if (adminUser && adminUser.email) {
      // Validate required fields for admin user
      if (!adminUser.email || typeof adminUser.email !== 'string' || !adminUser.email.includes('@')) {
        return res.status(400).json({ error: 'Valid admin email is required', client: created });
      }
      try {
        const exists = await prisma.users_enhanced.findFirst({ where: { email: adminUser.email } });
        if (exists) {
          // Rollback: delete the created client since admin creation will fail
          await prisma.clients.delete({ where: { id: created.id } }).catch(() => {});
          return res.status(409).json({ error: 'Admin email already exists' });
        }
      } catch (lookupErr) {
        console.warn('[clientManagement] Email lookup failed:', lookupErr?.message);
      }
      const bcrypt = require('bcryptjs');
      const crypto = require('crypto');
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
      
      try {
        adminCreated = await prisma.users_enhanced.create({
          data: {
            id: crypto.randomUUID(), // Generate UUID for user ID
            username,
            email: adminUser.email,
            password_hash: hashed,
            role: 'ADMIN',
            is_active: true,
            product_type: productType, // Fixed: use correct column name
            tenant_id: created.id,
            super_admin_id: sid,
            profile_pic_url: adminUser.profile_pic_url || null,
            business_level: 1,    // Default L1 for tenant admin
            reports_to: null,      // Top-level admin has no manager
          },
        });
      } catch (userErr) {
        console.error('[clientManagement] Failed to create admin user:', userErr.message);
        // Rollback: delete the created client since admin creation failed
        await prisma.clients.delete({ where: { id: created.id } }).catch(() => {});
        return res.status(500).json({ error: 'Failed to create admin user', details: userErr.message });
      }
    }
    res.status(201).json({ success: true, data: created, admin: adminCreated ? { id: adminCreated.id, email: adminCreated.email, username: adminCreated.username } : null, tempPassword });
  } catch (e) { res.status(500).json({ error: 'Failed to create client', details: e.message }); }
});

// Fetch single client
router.get('/clients/:id', authMiddleware, async (req, res) => {
  try {
    const user = req.user;
    const clientId = String(req.params.id);
    const client = await prisma.clients.findUnique({ where: { id: clientId } });
    if (!client) return res.status(404).json({ error: 'Client not found' });
    
    // Use scope-based authorization
    const isCrossTenant = hasCrossTenantScope(user);
    const isTenantAdmin = hasTenantAdminScope(user);
    const ownsClient = user?.super_admin_id === client.super_admin_id || user?.id === client.super_admin_id;
    
    // Allow: CROSS_TENANT, TENANT admin who owns this client
    if (!isCrossTenant && (!isTenantAdmin || !ownsClient)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    
    // Fetch only ADMIN role users associated with this client (tenant_id = client.id)
    const adminUsers = await prisma.users_enhanced.findMany({
      where: { 
        tenant_id: clientId,
        is_active: true,
        role: 'ADMIN',  // Only show ADMIN role users
      },
      select: {
        id: true,
        email: true,
        username: true,
        first_name: true,
        last_name: true,
        role: true,
        created_at: true,
        password_hash: true,  // To check if password exists
      },
      orderBy: { created_at: 'asc' },
    });
    
    // Fetch the client's current subscription with plan details
    let currentSubscription = null;
    try {
      const subscription = await prisma.client_subscriptions.findUnique({
        where: { client_id: clientId },
      });
      if (subscription) {
        // Fetch the plan separately since there's no direct relation
        let planInfo = null;
        if (subscription.plan_id) {
          planInfo = await prisma.subscription_plans.findUnique({
            where: { id: subscription.plan_id },
            select: { id: true, plan_code: true, name: true },
          });
        }
        currentSubscription = {
          planId: subscription.plan_id,
          planCode: planInfo?.plan_code || null,
          planName: planInfo?.name || null,
          state: subscription.state,
          startedAt: subscription.started_at,
          expiresAt: subscription.expires_at,
          trialEndDate: subscription.trial_end_date,
          isActive: subscription.is_active,
        };
      }
    } catch (subErr) {
      console.error('[GET client] Subscription fetch error:', subErr.message);
    }
    
    res.json({ 
      success: true, 
      data: {
        ...client,
        currentSubscription,
        admin_users: adminUsers.map(u => ({
          email: u.email,
          name: u.first_name && u.last_name ? `${u.first_name} ${u.last_name}` : u.username || u.email.split('@')[0],
          role: u.role || 'Admin',
          id: u.id,
          hasPassword: !!(u.password_hash && u.password_hash.length > 0),  // Indicate if password exists
          isExisting: true,  // Mark as existing user
        })),
      },
    });
  } catch (e) { res.status(500).json({ error: 'Failed to fetch client', details: e.message }); }
});

// Update client (partial)
router.patch('/clients/:id', authMiddleware, async (req, res) => {
  try {
    const prismaClient = getPrisma();
    if (!prismaClient) {
      return res.status(503).json({ error: 'Database temporarily unavailable' });
    }
    const user = req.user;
    const clientId = String(req.params.id);
    console.log('[PATCH client] clientId:', clientId, 'user:', { id: user?.id, role: user?.role, super_admin_id: user?.super_admin_id, system_scope: user?.system_scope });
    console.log('[PATCH client] body keys:', Object.keys(req.body || {}));
    const existing = await prismaClient.clients.findUnique({ where: { id: clientId } });
    if (!existing) return res.status(404).json({ error: 'Client not found' });
    console.log('[PATCH client] existing.super_admin_id:', existing.super_admin_id);
    
    // Use scope-based authorization
    const isCrossTenant = hasCrossTenantScope(user);
    const isTenantAdmin = hasTenantAdminScope(user);
    const ownsClient = user?.super_admin_id === existing.super_admin_id || user?.id === existing.super_admin_id;
    console.log('[PATCH client] isCrossTenant:', isCrossTenant, 'isTenantAdmin:', isTenantAdmin, 'ownsClient:', ownsClient);
    
    // Allow: CROSS_TENANT, TENANT admin who owns this client
    if (!isCrossTenant && (!isTenantAdmin || !ownsClient)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
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
    
    // Build the settings object with logo and display_name support
    const existingSettings = existing.settings || {};
    const newSettings = {
      ...existingSettings,
      enterprise,
    };
    
    // Handle logo upload (base64 data URL from frontend)
    if (b.logo && b.logo.data) {
      newSettings.logo = {
        data: b.logo.data,
        filename: b.logo.filename || 'logo',
        size: b.logo.size || 0,
        uploadedAt: new Date().toISOString(),
      };
      console.log('[PATCH client] Logo uploaded for client:', clientId);
    }
    
    // Handle display name for branding
    if (b.display_name !== undefined) {
      newSettings.display_name = b.display_name;
    }
    
    // Handle admin users - create new users or update existing
    const adminUserResults = [];
    if (b.admin_users && Array.isArray(b.admin_users)) {
      const bcrypt = require('bcryptjs');
      console.log('[PATCH client] Processing admin_users:', b.admin_users.length);
      for (const adminUser of b.admin_users) {
        if (!adminUser.email || !adminUser.email.includes('@')) {
          console.log('[PATCH client] Skipping invalid admin user:', adminUser.email);
          continue;
        }
        
        try {
          // Check if user already exists
          const existingUser = await prismaClient.user.findUnique({ 
            where: { email: adminUser.email },
            select: { id: true, tenant_id: true, email: true, username: true }
          });
          
          if (existingUser) {
            // User exists - check if they belong to this client
            if (existingUser.tenant_id === clientId) {
              // Update existing user if password provided
              if (adminUser.password && adminUser.password.length >= 6) {
                const hashed = await bcrypt.hash(adminUser.password, 10);
                await prismaClient.user.update({
                  where: { id: existingUser.id },
                  data: { 
                    password_hash: hashed,
                    username: adminUser.name || existingUser.username,
                  }
                });
                console.log('[PATCH client] Updated existing admin user:', adminUser.email);
              }
              adminUserResults.push({ email: adminUser.email, status: 'existing', updated: !!adminUser.password });
            } else {
              // User exists but belongs to another client
              console.log('[PATCH client] User exists in different tenant:', adminUser.email);
              adminUserResults.push({ email: adminUser.email, status: 'conflict', error: 'Email already in use by another client' });
            }
          } else {
            // Create new user
            if (!adminUser.password || adminUser.password.length < 6) {
              console.log('[PATCH client] Skipping new user without password:', adminUser.email);
              adminUserResults.push({ email: adminUser.email, status: 'skipped', error: 'Password required for new users' });
              continue;
            }
            
            const username = adminUser.name || adminUser.email.split('@')[0];
            const hashed = await bcrypt.hash(adminUser.password, 10);
            
            const newUser = await prismaClient.user.create({
              data: {
                tenant_id: clientId,
                username: username,
                email: adminUser.email,
                password_hash: hashed,
                role: 'ADMIN',
                status: 'active',
                is_active: true,
              }
            });
            console.log('[PATCH client] Created new admin user:', adminUser.email, 'id:', newUser.id);
            adminUserResults.push({ email: adminUser.email, status: 'created', userId: newUser.id });
          }
        } catch (userErr) {
          console.error('[PATCH client] Error processing admin user:', adminUser.email, userErr.message);
          adminUserResults.push({ email: adminUser.email, status: 'error', error: userErr.message });
        }
      }
    }
    
    const updated = await prismaClient.clients.update({ 
      where: { id: clientId }, 
      data: { 
        settings: newSettings,
        // Also update trade_name if display_name is provided (for backward compatibility)
        ...(b.display_name ? { trade_name: b.display_name } : {}),
      } 
    });
    res.json({ success: true, data: updated, adminUsers: adminUserResults });
  } catch (e) { 
    console.error('[PATCH client] Error:', e.message, e.stack);
    res.status(500).json({ error: 'Failed to update client', details: e.message }); 
  }
});

router.get('/clients/:id/permissions', authMiddleware, async (req, res) => {
  try {
    const user = req.user;
    const { id } = req.params;
    const clientId = String(id);
    const ensure = String(req.query.ensure || '').toLowerCase() === 'true';
    const client = await prisma.clients.findUnique({ where: { id: clientId } });
    if (!client) return res.status(404).json({ error: 'Client not found' });
    
    // Use scope-based authorization
    const isCrossTenant = hasCrossTenantScope(user);
    const ownsClient = user?.super_admin_id === client.super_admin_id || user?.id === client.super_admin_id;
    if (!isCrossTenant && !ownsClient) return res.status(403).json({ error: 'Forbidden' });
    // Optionally ensure permission row exists for every active module
    if (ensure) {
      const modules = await prisma.modules.findMany({ where: { is_active: true } });
      for (const m of modules) {
        await prisma.client_module_permissions.upsert({
          where: { client_id_module_id: { client_id: clientId, module_id: m.id } },
          update: {},
          create: { client_id: clientId, module_id: m.id, can_view: false, can_create: false, can_edit: false, can_delete: false }
        });
      }
    }
    const permissions = await prisma.client_module_permissions.findMany({ where: { client_id: clientId }, include: { module: true }, orderBy: { module_id: 'asc' } });
    res.json({ success: true, data: permissions });
  } catch (e) { res.status(500).json({ error: 'Failed to fetch permissions', details: e.message }); }
});

router.put('/clients/:id/permissions/:moduleId', authMiddleware, async (req, res) => {
  try {
    const user = req.user;
    const { id, moduleId } = req.params;
    const clientId = String(id);
    const client = await prisma.clients.findUnique({ where: { id: clientId } });
    if (!client) return res.status(404).json({ error: 'Client not found' });
    
    // Use scope-based authorization
    const isCrossTenant = hasCrossTenantScope(user);
    const isTenantAdmin = hasTenantAdminScope(user);
    const ownsClient = user?.super_admin_id === client.super_admin_id || user?.id === client.super_admin_id;
    if (!isCrossTenant && (!isTenantAdmin || !ownsClient)) return res.status(403).json({ error: 'Forbidden' });
    const { can_view, can_create, can_edit, can_delete } = req.body;
    const updated = await prisma.client_module_permissions.upsert({ where: { client_id_module_id: { client_id: clientId, module_id: Number(moduleId) } }, update: { can_view, can_create, can_edit, can_delete }, create: { client_id: clientId, module_id: Number(moduleId), can_view: !!can_view, can_create: !!can_create, can_edit: !!can_edit, can_delete: !!can_delete } });
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
    const client = await prisma.clients.findUnique({ where: { id: clientId } });
    if (!client) return res.status(404).json({ error: 'Client not found' });
    
    // Use scope-based authorization
    const isCrossTenant = hasCrossTenantScope(user);
    const isTenantAdmin = hasTenantAdminScope(user);
    const ownsClient = user?.super_admin_id === client.super_admin_id || user?.id === client.super_admin_id;
    if (!isCrossTenant && (!isTenantAdmin || !ownsClient)) return res.status(403).json({ error: 'Forbidden' });
    const items = Array.isArray(req.body?.items) ? req.body.items : [];
    if (items.length === 0) return res.status(400).json({ error: 'items array required' });
    const ops = items
      .filter((it) => it && typeof it.module_id === 'number')
      .map((it) =>
        prisma.client_module_permissions.upsert({
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
    const client = await prisma.clients.findUnique({ where: { id: clientId } });
    if (!client) return res.status(404).json({ error: 'Client not found' });
    
    // Use scope-based authorization
    const isCrossTenant = hasCrossTenantScope(user);
    const isTenantAdmin = hasTenantAdminScope(user);
    const ownsClient = user?.super_admin_id === client.super_admin_id || user?.id === client.super_admin_id;
    if (!isCrossTenant && (!isTenantAdmin || !ownsClient)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const updated = await prisma.clients.update({ where: { id: clientId }, data: { is_active } });
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
  const client = await prisma.clients.findUnique({ where: { id: clientId } });
    if (!client) return res.status(404).json({ error: 'Client not found' });
    
    // Use scope-based authorization
    const isCrossTenant = hasCrossTenantScope(user);
    const ownsClient = user?.super_admin_id === client.super_admin_id || user?.id === client.super_admin_id;
    if (!isCrossTenant && !ownsClient) return res.status(403).json({ error: 'Forbidden' });
  const usage = await prisma.clientDailyUsage.findMany({ where: { client_id: clientId }, orderBy: { date: 'desc' }, take: 30 });
    res.json({ success: true, data: usage });
  } catch (e) { res.status(500).json({ error: 'Failed to fetch usage', details: e.message }); }
});

// ============================================
// GET ROLES FOR A CLIENT
// Returns all roles assigned to this client
// ============================================
router.get('/clients/:id/roles', authMiddleware, async (req, res) => {
  try {
    const user = req.user;
    const { id } = req.params;
    
    // Client ID can be UUID string or integer
    const clientId = id;
    
    if (!clientId) {
      return res.status(400).json({ error: 'Invalid client ID' });
    }
    
    // Use scope-based authorization - only CROSS_TENANT can view all client roles
    if (!hasCrossTenantScope(user)) {
      return res.status(403).json({ error: 'Cross-tenant access required' });
    }
    
    // Get client_roles from client_role_assignments table
    let assignedRoleIds = [];
    try {
      const assignments = await prisma.client_role_assignments.findMany({
        where: { client_id: clientId }
      });
      assignedRoleIds = assignments.map(a => a.role_id);
      console.log('[clientManagement] Found', assignedRoleIds.length, 'role assignments for client:', clientId);
    } catch (tableErr) {
      console.error('[clientManagement] Error fetching role assignments:', tableErr.message);
    }
    
    // Get full role details
    let roles = [];
    if (assignedRoleIds.length > 0) {
      try {
        roles = await prisma.rbac_roles.findMany({
          where: { id: { in: assignedRoleIds } }
        });
      } catch (roleErr) {
        console.warn('[clientManagement] Could not fetch role details:', roleErr.message);
      }
    }
    
    res.json({ 
      success: true, 
      clientId,
      roleIds: assignedRoleIds,
      roles: roles.map(r => ({
        id: r.id,
        name: r.name,
        display_name: r.display_name || r.name,
        level: r.level
      }))
    });
  } catch (e) {
    console.error('[clientManagement] Error fetching client roles:', e);
    res.status(500).json({ error: 'Failed to fetch client roles', details: e.message });
  }
});

// ============================================
// UPDATE ROLES FOR A CLIENT
// Save which roles are assigned to this client
// ============================================
router.post('/clients/:id/roles', authMiddleware, async (req, res) => {
  try {
    const user = req.user;
    const { id } = req.params;
    const { roleIds } = req.body;
    
    // Client ID can be UUID string or integer
    const clientId = id;
    
    if (!clientId) {
      return res.status(400).json({ error: 'Invalid client ID' });
    }
    
    // Use scope-based authorization - only CROSS_TENANT can modify client roles
    if (!hasCrossTenantScope(user)) {
      return res.status(403).json({ error: 'Cross-tenant access required' });
    }
    
    const roleIdsArray = Array.isArray(roleIds) ? roleIds.map(id => parseInt(id, 10)).filter(id => !isNaN(id)) : [];
    
    console.log('[clientManagement] Saving roles for client:', clientId, 'roleIds:', roleIdsArray);
    
    // Use ClientRoleAssignment table
    try {
      // Delete existing assignments
      await prisma.clientRoleAssignment.deleteMany({
        where: { client_id: clientId }
      });
      
      // Create new assignments
      if (roleIdsArray.length > 0) {
        await prisma.clientRoleAssignment.createMany({
          data: roleIdsArray.map(roleId => ({
            client_id: clientId,
            role_id: roleId,
            created_at: new Date(),
            updated_at: new Date()
          }))
        });
      }
      
      console.log('[clientManagement] Saved', roleIdsArray.length, 'roles for client:', clientId);
      
      res.json({ 
        success: true, 
        clientId,
        message: 'Client roles updated successfully',
        roleCount: roleIdsArray.length
      });
    } catch (dbErr) {
      console.error('[clientManagement] Database error saving roles:', dbErr.message);
      res.status(500).json({ error: 'Failed to save client roles', details: dbErr.message });
    }
  } catch (e) {
    console.error('[clientManagement] Error saving client roles:', e);
    res.status(500).json({ error: 'Failed to save client roles', details: e.message });
  }
});

module.exports = router;
