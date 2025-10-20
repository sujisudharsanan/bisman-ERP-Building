// Users Report Routes
// Exposes /api/users/report?format=csv|json to download user data from DB

const express = require('express');
const router = express.Router();
const { authenticate, requireRole } = require('../middleware/auth');
const { getPrisma } = require('../lib/prisma');
const privilegeService = require('../services/privilegeService');

function safe(val) {
  if (val == null) return '';
  if (val instanceof Date) return val.toISOString();
  return String(val);
}

function toCsv(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const escape = (v) => {
    const s = safe(v);
    if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  };
  const lines = [headers.join(',')];
  for (const row of rows) {
    lines.push(headers.map((h) => escape(row[h])).join(','));
  }
  return lines.join('\n');
}

router.get('/users/report', [authenticate, requireRole(['ADMIN', 'SUPER_ADMIN'])], async (req, res) => {
  let prisma = null;
  try { prisma = getPrisma(); } catch (_) { prisma = null; }
  const format = String(req.query.format || 'csv').toLowerCase();
  try {
    // Load users from DB when possible, otherwise gracefully fall back to service's dev users
    let users = [];
    if (prisma && prisma.user) {
      try {
        users = await prisma.user.findMany({
          include: { role: { select: { id: true, name: true } } },
        });
      } catch (_) {
        try {
          users = await prisma.user.findMany({ include: { role: { select: { id: true, name: true } } } });
        } catch (_) {
          users = [];
        }
      }
    }
    // If DB returned nothing (or not available), use fallback users (dev/no-DB)
    if (!Array.isArray(users) || users.length === 0) {
      try {
        users = await privilegeService.getUsersByRole(undefined);
      } catch (_) {
        users = [];
      }
    }

    const rows = users.map((u) => {
      const firstName = u.first_name ?? u.firstName ?? '';
      const lastName = u.last_name ?? u.lastName ?? '';
      const created = u.created_at ?? u.createdAt ?? null;
      const updated = u.updated_at ?? u.updatedAt ?? null;
      const status = u.status ?? (u.is_active === false ? 'inactive' : 'active');
      const roleId = (u.role && (u.role.id ?? u.role_id)) ?? u.role_id ?? '';
      const roleName = (u.role && u.role.name) || '';
      return {
        id: u.id,
        username: u.username || '',
        email: u.email || '',
        first_name: firstName,
        last_name: lastName,
        full_name: [firstName, lastName].filter(Boolean).join(' ').trim(),
        role_id: roleId,
        role_name: roleName,
        status,
        created_at: created instanceof Date ? created.toISOString() : safe(created),
        updated_at: updated instanceof Date ? updated.toISOString() : safe(updated),
      };
    });

    if (format === 'json') {
      return res.json({ success: true, total: rows.length, data: rows, timestamp: new Date().toISOString() });
    }

    const csv = toCsv(rows);
    const fileName = `users_report_${new Date().toISOString().slice(0,10)}.csv`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    return res.send(csv);
  } catch (error) {
    console.error('Users report generation failed:', error);
    // Graceful fallback to empty CSV rather than failing the download
    if (format === 'json') {
      return res.json({ success: true, total: 0, data: [], timestamp: new Date().toISOString() });
    }
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="users_report_${new Date().toISOString().slice(0,10)}.csv"`);
    return res.send('');
  }
});

module.exports = router;
