#!/usr/bin/env node
/*
  RBAC Seed Script
  - Creates minimal RBAC tables if they don't exist
  - Seeds actions, routes, and a comprehensive demo role set
  - Grants Super Admin full permissions
  - Optionally seeds demo user-role links (no FKs to avoid coupling)
*/

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') })
const { Pool } = require('pg')

function getPool() {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL not set')
  const needSSL = !/localhost|127\.0\.0\.1/i.test(url)
  return new Pool({ connectionString: url, ssl: needSSL ? { rejectUnauthorized: false } : false })
}

const ACTIONS = [
  { name: 'VIEW', description: 'Read access' },
  { name: 'CREATE', description: 'Create resource' },
  { name: 'EDIT', description: 'Edit resource' },
  { name: 'DELETE', description: 'Delete resource' },
  { name: 'HIDE', description: 'Toggle visibility' },
]

// Expanded role set aligned with privilegeService DEFAULT_ROLES
const ROLES = [
  { name: 'Super Admin', description: 'Full system access', level: 10 },
  { name: 'Admin', description: 'Administrative access', level: 9 },
  { name: 'System Administrator', description: 'System administration and governance', level: 9 },
  { name: 'IT Admin', description: 'IT administration and platform operations', level: 8 },
  { name: 'Operations Manager', description: 'Operations oversight and coordination', level: 7 },
  { name: 'Manager', description: 'Managerial access', level: 6 },
  { name: 'Staff', description: 'Standard user access', level: 1 },
  { name: 'Demo User', description: 'Demonstration account', level: 1 },

  // Finance
  { name: 'CFO', description: 'Chief Financial Officer', level: 9 },
  { name: 'Finance Controller', description: 'Financial control and reporting', level: 8 },
  { name: 'Treasury', description: 'Cash management and treasury operations', level: 7 },
  { name: 'Accounts', description: 'General ledger and accounting', level: 5 },
  { name: 'Accounts Payable', description: 'Vendor invoices and payments', level: 4 },
  { name: 'Banker', description: 'Banking liaison and reconciliation', level: 5 },

  // Ops
  { name: 'Procurement Officer', description: 'Purchase requests and orders', level: 4 },
  { name: 'Store Incharge', description: 'Warehouse and inventory custody', level: 3 },
  { name: 'Hub Incharge', description: 'Hub operations and coordination', level: 3 },

  // Governance
  { name: 'Compliance', description: 'Compliance and audit', level: 6 },
  { name: 'Legal', description: 'Legal and contracts', level: 6 },
]

// Minimal useful routes to make the dashboard stats meaningful
const ROUTES = [
  // System
  { path: '/api/health/database', name: 'DB Health', description: 'Database health', method: 'GET', module: 'System', is_protected: false },

  // User Management
  { path: '/api/users', name: 'Users list', description: 'List users', method: 'GET', module: 'User Management', is_protected: true },
  { path: '/api/users', name: 'Create user', description: 'Create user', method: 'POST', module: 'User Management', is_protected: true },
  { path: '/api/users', name: 'Update user', description: 'Update user', method: 'PUT', module: 'User Management', is_protected: true },
  { path: '/api/users', name: 'Delete user', description: 'Delete user', method: 'DELETE', module: 'User Management', is_protected: true },

  // Privileges
  { path: '/api/privileges/roles', name: 'Roles', description: 'List roles', method: 'GET', module: 'Privileges', is_protected: true },
  { path: '/api/privileges/users', name: 'Users by role', description: 'List users by role', method: 'GET', module: 'Privileges', is_protected: true },
  { path: '/api/privileges/privileges', name: 'Privilege matrix', description: 'List privileges', method: 'GET', module: 'Privileges', is_protected: true },
  { path: '/api/privileges/privileges', name: 'Update privileges', description: 'Update privileges', method: 'PUT', module: 'Privileges', is_protected: true },
  { path: '/api/privileges/audit-logs', name: 'Audit logs', description: 'Audit logs', method: 'GET', module: 'Privileges', is_protected: true },

  // Hub Incharge
  { path: '/api/hub-incharge/profile', name: 'Profile', description: 'Hub profile', method: 'GET', module: 'Hub', is_protected: true },
  { path: '/api/hub-incharge/approvals', name: 'Approvals list', description: 'Approvals', method: 'GET', module: 'Hub', is_protected: true },
  { path: '/api/hub-incharge/approvals', name: 'Approve/Reject', description: 'Update approval', method: 'PATCH', module: 'Hub', is_protected: true },
  { path: '/api/hub-incharge/expenses', name: 'Expenses list', description: 'Expenses', method: 'GET', module: 'Hub', is_protected: true },
  { path: '/api/hub-incharge/expenses', name: 'Create expense', description: 'Create expense', method: 'POST', module: 'Hub', is_protected: true },
  { path: '/api/hub-incharge/tasks', name: 'Tasks list', description: 'Tasks', method: 'GET', module: 'Hub', is_protected: true },
  { path: '/api/hub-incharge/tasks', name: 'Create task', description: 'Create task', method: 'POST', module: 'Hub', is_protected: true },
  { path: '/api/hub-incharge/tasks', name: 'Update task', description: 'Update task', method: 'PATCH', module: 'Hub', is_protected: true },
  { path: '/api/hub-incharge/settings', name: 'Settings', description: 'Settings', method: 'GET', module: 'Hub', is_protected: true },
  { path: '/api/hub-incharge/settings', name: 'Update settings', description: 'Update settings', method: 'PATCH', module: 'Hub', is_protected: true },
]

// Optional demo user-role mappings (ids align with dev users in app.js)
const DEMO_USER_ROLE_MAP = [
  { user_id: 0, role: 'Super Admin' },
  { user_id: 2, role: 'Admin' },
  { user_id: 1, role: 'Manager' },
  { user_id: 3, role: 'Staff' },
  { user_id: 201, role: 'IT Admin' },
  { user_id: 202, role: 'CFO' },
  { user_id: 203, role: 'Finance Controller' },
  { user_id: 204, role: 'Treasury' },
  { user_id: 205, role: 'Accounts' },
  { user_id: 206, role: 'Accounts Payable' },
  { user_id: 207, role: 'Banker' },
  { user_id: 208, role: 'Procurement Officer' },
  { user_id: 209, role: 'Store Incharge' },
  { user_id: 210, role: 'Compliance' },
  { user_id: 211, role: 'Legal' },
]

async function main() {
  const pool = getPool()
  const client = await pool.connect()
  try {
    console.log('Seeding RBAC...')

    // Create tables if not exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS rbac_roles (
        id SERIAL PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        description TEXT,
        level INTEGER DEFAULT 1,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS rbac_actions (
        id SERIAL PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        description TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS rbac_routes (
        id SERIAL PRIMARY KEY,
        path TEXT NOT NULL,
        name TEXT,
        description TEXT,
        method TEXT DEFAULT 'GET',
        module TEXT,
        is_protected BOOLEAN DEFAULT TRUE,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(path, method)
      );

      CREATE TABLE IF NOT EXISTS rbac_permissions (
        id SERIAL PRIMARY KEY,
        role_id INTEGER NOT NULL,
        action_id INTEGER NOT NULL,
        route_id INTEGER NOT NULL,
        granted BOOLEAN DEFAULT FALSE,
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(role_id, action_id, route_id)
      );

      CREATE TABLE IF NOT EXISTS rbac_user_roles (
        user_id INTEGER NOT NULL,
        role_id INTEGER NOT NULL,
        assigned_at TIMESTAMPTZ DEFAULT NOW()
      );
    `)

    // Upsert actions
    for (const a of ACTIONS) {
      await client.query(
        `INSERT INTO rbac_actions (name, description) VALUES ($1, $2)
         ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description`,
        [a.name, a.description]
      )
    }

    // Upsert roles
    for (const r of ROLES) {
      await client.query(
        `INSERT INTO rbac_roles (name, description, level, updated_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description, level = EXCLUDED.level, updated_at = NOW()`,
        [r.name, r.description, r.level]
      )
    }

    // Upsert routes
    for (const rt of ROUTES) {
      await client.query(
        `INSERT INTO rbac_routes (path, name, description, method, module, is_protected)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (path, method) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, module = EXCLUDED.module, is_protected = EXCLUDED.is_protected`,
        [rt.path, rt.name, rt.description, rt.method, rt.module, rt.is_protected]
      )
    }

    // Fetch ids for mapping
    const { rows: actionRows } = await client.query('SELECT id, name FROM rbac_actions')
    const { rows: roleRows } = await client.query('SELECT id, name FROM rbac_roles')
    const { rows: routeRows } = await client.query('SELECT id, path, method FROM rbac_routes')
    const actionIdByName = Object.fromEntries(actionRows.map(a => [a.name, a.id]))
    const roleIdByName = Object.fromEntries(roleRows.map(r => [r.name, r.id]))
    const routeIdByKey = Object.fromEntries(routeRows.map(rt => [`${rt.path}#${rt.method}`, rt.id]))

    // Grant ALL permissions to Super Admin
    const superId = roleIdByName['Super Admin']
    if (superId) {
      for (const rt of ROUTES) {
        for (const a of ACTIONS) {
          const routeId = routeIdByKey[`${rt.path}#${rt.method}`]
          const actionId = actionIdByName[a.name]
          await client.query(
            `INSERT INTO rbac_permissions (role_id, action_id, route_id, granted, updated_at)
             VALUES ($1, $2, $3, true, NOW())
             ON CONFLICT (role_id, action_id, route_id) DO UPDATE SET granted = true, updated_at = NOW()`,
            [superId, actionId, routeId]
          )
        }
      }
    }

    // Optional: seed demo user-role links (ignore failures)
    for (const map of DEMO_USER_ROLE_MAP) {
      const rid = roleIdByName[map.role]
      if (!rid) continue
      await client.query(
        `INSERT INTO rbac_user_roles (user_id, role_id, assigned_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT DO NOTHING`,
        [map.user_id, rid]
      ).catch(() => {})
    }

    // Output summary
    const counts = {}
    for (const t of ['rbac_roles', 'rbac_actions', 'rbac_routes', 'rbac_permissions', 'rbac_user_roles']) {
      const { rows } = await client.query(`SELECT COUNT(*)::int AS c FROM ${t}`)
      counts[t] = rows[0].c
    }
    console.log('RBAC seed complete:', counts)
  } finally {
    client.release()
    await pool.end()
  }
}

main().catch(err => {
  console.error('RBAC seed failed:', err.message)
  process.exit(1)
})
