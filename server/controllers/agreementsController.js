// agreementsController.js - basic REST handlers (view + totals refresh + webhooks)
// NOTE: integrate with existing Express/Koa/Fastify app (adjust import patterns accordingly)

const { Pool } = require('pg');
const pool = new Pool(); // expects DATABASE_URL env

// Utility: compute totals for one agreement
async function computeAgreementTotals(client, agreementId) {
  const payments = await client.query(`SELECT payment_type, amount FROM agreement_payments WHERE agreement_id=$1`, [agreementId]);
  let totalPaid = 0, advanceAmount = 0, totalDeductions = 0;
  for (const row of payments.rows) {
    if (row.payment_type === 'advance') advanceAmount += Number(row.amount);
    if (row.payment_type === 'advance' || row.payment_type === 'regular') totalPaid += Number(row.amount);
    if (row.payment_type === 'deduction') totalDeductions += Number(row.amount);
  }
  const invoices = await client.query(`SELECT type, amount FROM agreement_invoices WHERE agreement_id=$1`, [agreementId]);
  let totalInvoiced = 0;
  for (const row of invoices.rows) {
    if (row.type === 'invoice') totalInvoiced += Number(row.amount);
    if (row.type === 'credit_note') totalDeductions += Number(row.amount); // treat credit note as deduction
  }
  const balance = totalInvoiced - totalPaid - totalDeductions;
  return { advanceAmount, totalPaid, totalInvoiced, totalDeductions, balance };
}

// GET /api/agreements
async function listAgreements(req, res) {
  const { q, type, status, party_id, date_from, date_to, sort = 'end_date.asc', page = 1, per_page = 20 } = req.query;
  const offset = (page - 1) * per_page;
  const params = [];
  const where = [];
  if (q) { params.push(`%${q}%`); where.push(`(reference ILIKE $${params.length} OR title ILIKE $${params.length})`); }
  if (type) { params.push(type); where.push(`contract_type = $${params.length}`); }
  if (status) { params.push(status); where.push(`status = $${params.length}`); }
  if (party_id) { params.push(party_id); where.push(`party_id = $${params.length}`); }
  if (date_from) { params.push(date_from); where.push(`start_date >= $${params.length}`); }
  if (date_to) { params.push(date_to); where.push(`end_date <= $${params.length}`); }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const order = (() => { const [col, dir] = sort.split('.'); return `ORDER BY ${col} ${dir === 'desc' ? 'DESC' : 'ASC'}`; })();
  const totalResult = await pool.query(`SELECT COUNT(*) FROM agreements ${whereSql}`, params);
  const rowsResult = await pool.query(`SELECT id, reference, title, contract_type, party_id, party_type, start_date, end_date, currency, base_amount, status, meta FROM agreements ${whereSql} ${order} OFFSET ${offset} LIMIT ${per_page}`, params);

  // compute totals per agreement (could optimize into single query / materialized view)
  const client = await pool.connect();
  try {
    const data = [];
    for (const row of rowsResult.rows) {
      const totals = await computeAgreementTotals(client, row.id);
      // next notification date (simplistic): derive from meta.reminders or default [30,15,7]
      const reminders = (row.meta && row.meta.reminders) || [30,15,7];
      const today = new Date();
      const endDate = new Date(row.end_date);
      let nextNotificationDate = null;
      for (const days of reminders.sort((a,b)=>b-a)) { // descending
        const target = new Date(endDate.getTime() - days*86400000);
        if (today <= target) nextNotificationDate = target.toISOString().slice(0,10); // first future reminder
      }
      data.push({
        id: row.id,
        reference: row.reference,
        title: row.title,
        contract_type: row.contract_type,
        party: { id: row.party_id, type: row.party_type },
        start_date: row.start_date,
        end_date: row.end_date,
        currency: row.currency,
        base_amount: row.base_amount,
        status: row.status,
        advance_amount: totals.advanceAmount,
        total_paid: totals.totalPaid,
        total_invoiced: totals.totalInvoiced,
        total_deductions: totals.totalDeductions,
        balance: totals.balance,
        next_notification_date: nextNotificationDate,
        attachments_count: 0 // optimized later with separate query or join
      });
    }
    res.json({ page: Number(page), per_page: Number(per_page), total: Number(totalResult.rows[0].count), data });
  } finally { client.release(); }
}

// GET /api/agreements/:id
async function getAgreement(req, res) {
  const { id } = req.params;
  const agRes = await pool.query(`SELECT * FROM agreements WHERE id=$1`, [id]);
  if (!agRes.rows.length) return res.status(404).json({ error: 'Not found' });
  const client = await pool.connect();
  try {
    const payments = await client.query(`SELECT * FROM agreement_payments WHERE agreement_id=$1 ORDER BY payment_date DESC`, [id]);
    const invoices = await client.query(`SELECT * FROM agreement_invoices WHERE agreement_id=$1 ORDER BY invoice_date DESC`, [id]);
    const attachments = await client.query(`SELECT id, file_name, mime_type, size_bytes, uploaded_at FROM agreement_attachments WHERE agreement_id=$1`, [id]);
    const notifications = await client.query(`SELECT * FROM agreement_notifications WHERE agreement_id=$1 ORDER BY notif_date DESC`, [id]);
    const totals = await computeAgreementTotals(client, id);
    res.json({ agreement: agRes.rows[0], payments: payments.rows, invoices: invoices.rows, attachments: attachments.rows, notifications: notifications.rows, totals });
  } finally { client.release(); }
}

// POST /api/agreements/:id/refresh-totals
async function refreshTotals(req, res) {
  const { id } = req.params;
  // could store materialized totals table; here just recompute
  const client = await pool.connect();
  try {
    const totals = await computeAgreementTotals(client, id);
    res.json({ id, totals });
  } finally { client.release(); }
}

// POST /api/webhooks/payment
async function webhookPayment(req, res) {
  const { agreement_id, agreement_reference, amount, currency, date, type, reference, source_system } = req.body;
  if (!amount || !currency || !date || !type) return res.status(400).json({ error: 'Missing required fields' });
  const client = await pool.connect();
  try {
    let agreementId = agreement_id;
    if (!agreementId && agreement_reference) {
      const lookup = await client.query(`SELECT id FROM agreements WHERE reference=$1`, [agreement_reference]);
      if (lookup.rows.length) agreementId = lookup.rows[0].id; else return res.status(404).json({ error: 'Agreement not found by reference' });
    }
    await client.query(`INSERT INTO agreement_payments (agreement_id, payment_date, amount, currency, payment_type, reference, source_system) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [agreementId, date, amount, currency, type, reference || null, source_system || null]);
    const totals = await computeAgreementTotals(client, agreementId);
    res.json({ status: 'ok', agreement_id: agreementId, totals });
  } finally { client.release(); }
}

// POST /api/webhooks/invoice
async function webhookInvoice(req, res) {
  const { agreement_id, agreement_reference, amount, currency, invoice_date, invoice_no, type, linked_payment_id } = req.body;
  if (!amount || !currency || !invoice_date || !invoice_no || !type) return res.status(400).json({ error: 'Missing required fields' });
  const client = await pool.connect();
  try {
    let agreementId = agreement_id;
    if (!agreementId && agreement_reference) {
      const lookup = await client.query(`SELECT id FROM agreements WHERE reference=$1`, [agreement_reference]);
      if (lookup.rows.length) agreementId = lookup.rows[0].id; else return res.status(404).json({ error: 'Agreement not found by reference' });
    }
    await client.query(`INSERT INTO agreement_invoices (agreement_id, invoice_no, invoice_date, amount, currency, type, linked_payment_id) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [agreementId, invoice_no, invoice_date, amount, currency, type, linked_payment_id || null]);
    const totals = await computeAgreementTotals(client, agreementId);
    res.json({ status: 'ok', agreement_id: agreementId, totals });
  } finally { client.release(); }
}

module.exports = { listAgreements, getAgreement, refreshTotals, webhookPayment, webhookInvoice };
