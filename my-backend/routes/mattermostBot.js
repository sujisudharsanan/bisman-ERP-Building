/**
 * Mattermost Chatbot Integration API
 * Connects ERP Assistant chatbot to BISMAN ERP backend
 * Provides real-time data for chatbot responses
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { getPrisma } = require('../lib/prisma');
const { getPgPool } = require('../lib/pgPool');

// ---------------------------------------------------------------------------
// Self-Learning Vocabulary (RAG term clarification) helpers
// ---------------------------------------------------------------------------
// Tables (auto-created if missing): vocab, vocab_pending
// vocab columns: id SERIAL PK, term TEXT, definition TEXT, normalized_term TEXT,
//                user_id TEXT, visibility TEXT (personal|public),
//                created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now()
// vocab_pending: id SERIAL PK, term TEXT, normalized_term TEXT,
//                user_id TEXT, suggestions JSONB, created_at TIMESTAMPTZ DEFAULT now()

const pg = getPgPool();
let vocabInitAttempted = false;

async function ensureVocabTables() {
  if (!pg || vocabInitAttempted) return;
  vocabInitAttempted = true;
  try {
    await pg.query(`CREATE TABLE IF NOT EXISTS vocab (
      id SERIAL PRIMARY KEY,
      term TEXT NOT NULL,
      definition TEXT NOT NULL,
      normalized_term TEXT NOT NULL,
      user_id TEXT NOT NULL,
      visibility TEXT NOT NULL CHECK (visibility IN ('personal','public')),
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    );`);
    await pg.query(`CREATE TABLE IF NOT EXISTS vocab_pending (
      id SERIAL PRIMARY KEY,
      term TEXT NOT NULL,
      normalized_term TEXT NOT NULL,
      user_id TEXT NOT NULL,
      suggestions JSONB NOT NULL,
      created_at TIMESTAMPTZ DEFAULT now()
    );`);
    console.log('[mattermostBot] ✅ vocab tables ensured');
  } catch (e) {
    console.error('[mattermostBot] ⚠️ Failed ensuring vocab tables:', e.message);
  }
}
ensureVocabTables();

function normalizeTerm(t) { return String(t).trim().toLowerCase(); }

function containsPII(s) {
  if (!s) return false;
  const emailRe = /[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}/;
  const digitsRe = /\d{7,}/; // 7+ consecutive digits (phone/id)
  const keyRe = /(api[_-]?key|secret|password|token)\s*[:=]/i;
  return emailRe.test(s) || digitsRe.test(s) || keyRe.test(s);
}

async function lookupTerm(term, userId) {
  if (!pg) return null;
  const norm = normalizeTerm(term);
  try {
    const { rows } = await pg.query(
      `SELECT id, term, definition, normalized_term, user_id, visibility, created_at
       FROM vocab
       WHERE normalized_term=$1 AND (visibility='public' OR user_id=$2)
       ORDER BY (user_id=$2) DESC LIMIT 1`, [norm, userId]
    );
    return rows[0] || null;
  } catch (e) {
    console.error('[mattermostBot] lookupTerm error:', e.message);
    return null;
  }
}

async function saveMapping(term, definition, userId, visibility) {
  if (!pg) throw new Error('DB unavailable');
  const norm = normalizeTerm(term);
  await pg.query(
    `INSERT INTO vocab(term, definition, normalized_term, user_id, visibility, created_at, updated_at)
     VALUES($1,$2,$3,$4,$5,now(),now())`, [term, definition, norm, userId, visibility]
  );
}

async function createPending(term, userId, suggestions) {
  if (!pg) return null;
  const norm = normalizeTerm(term);
  const { rows } = await pg.query(
    `INSERT INTO vocab_pending(term, normalized_term, user_id, suggestions, created_at)
     VALUES($1,$2,$3,$4,now()) RETURNING id`, [term, norm, userId, JSON.stringify(suggestions)]
  );
  return rows[0]?.id || null;
}

async function getPending(id) {
  if (!pg) return null;
  const { rows } = await pg.query('SELECT * FROM vocab_pending WHERE id=$1 LIMIT 1', [id]);
  if (!rows[0]) return null;
  const row = rows[0];
  try { row.suggestions = Array.isArray(row.suggestions) ? row.suggestions : JSON.parse(row.suggestions); } catch {}
  return row;
}

async function deletePending(id) {
  if (!pg) return; await pg.query('DELETE FROM vocab_pending WHERE id=$1', [id]);
}

function extractCandidateTerms(text) {
  if (!text) return [];
  // words with letters/numbers length >=3 (avoid very common stop words later if needed)
  const re = /\b[\p{L}0-9._-]{3,}\b/gu;
  const matches = text.match(re) || [];
  const unique = new Set();
  const out = [];
  for (const m of matches) {
    const norm = normalizeTerm(m);
    if (!unique.has(norm)) { unique.add(norm); out.push(m); }
    if (out.length >= 12) break; // cap to 12 tokens per query
  }
  return out;
}

async function suggestionsForTerm(term) {
  const url = process.env.RETRIEVAL_API_URL;
  const key = process.env.RETRIEVAL_API_KEY;
  let suggestions = [];
  if (url) {
    try {
      const resp = await fetch(url, { method:'POST', headers: { 'Content-Type':'application/json', ...(key?{Authorization:`Bearer ${key}`}:{}) }, body: JSON.stringify({ q: term, top_k: 3 }) });
      if (resp.ok) {
        const data = await resp.json();
        const results = data.results || [];
        for (const r of results.slice(0,3)) {
          if (r.snippet) suggestions.push(r.snippet);
          else if (r.title) suggestions.push(r.title);
        }
      }
    } catch (e) {
      console.warn('[mattermostBot] retrieval suggestion error:', e.message);
    }
  }
  while (suggestions.length < 3) {
    if (suggestions.length === 0) suggestions.push(`Possible meaning: ${term} (please define).`);
    else if (suggestions.length === 1) suggestions.push(`Could be an acronym/codename related to ${term}.`);
    else suggestions.push(`Maybe a config file or tool named ${term}.`);
  }
  return suggestions.slice(0,3);
}

function personaFormat(summarySentence, steps = [], nextStep = '') {
  const lines = [summarySentence.trim()];
  if (steps.length) {
    lines.push('');
    for (let i=0;i<steps.length;i++) lines.push(`${i+1}. ${steps[i]}`);
  }
  if (nextStep) {
    lines.push('');
    lines.push(`Next: ${nextStep}`);
  }
  return lines.join('\n');
}

// Final system prompt constant (exposed via /system-prompt)
const SYSTEM_PROMPT_TEXT = `You are "Suji-Copilot", a warm, supportive, and practical Mattermost assistant.\n\nBehavior rules (always apply):\n1. Tone & structure:\n   - Warm, empathetic, concise. Lead with a one-sentence summary, then 2–5 short actionable steps, then one offered next step.\n2. Use the RETRIEVED_DOCS for factual claims (RAG). If the docs don't answer, say "I don't have that info in our docs" and provide 3 next steps.\n3. Unknown / unrecognized terms handling (core behavior):\n   - If a user uses a word/phrase not recognized in vocabulary DB, ask clarifying question with 3 plausible interpretations; ask user to confirm or define. Store mapping afterwards.\n4. Persisting & privacy: Save user-confirmed mapping (term, normalized_definition, user_id, visibility personal|public). Reject storing PII (emails, phone numbers, passwords/keys).\n5. Learning & usage: Prefer personal mapping; cite "Using your definition for 'Term' (saved on <date>)" when used.\n6. Escalation: For public mapping changes, prepare ticket draft and seek confirmation.\n7. Error handling: If DB unavailable, state inability to access definitions and offer general guidance.\n8. Limits: ≤ 6 short paragraphs. Clarify only when needed.`;

const prisma = getPrisma();

// Mattermost API helper (admin/bot token based)
const MM_BASE = (process.env.MM_URL || process.env.MATTERMOST_URL || '').replace(/\/$/, '');
const MM_TOKEN = process.env.MM_TOKEN || process.env.MATTERMOST_TOKEN || '';
const MM_TEAM = process.env.MM_TEAM_NAME || process.env.MATTERMOST_TEAM || 'bisman';
const MM_DEFAULT_PASSWORD = process.env.MATTERMOST_DEFAULT_PASSWORD || 'Temp12345!';
let cachedTeamId = null;

async function mmFetch(path, init = {}) {
  if (!MM_BASE) throw new Error('Mattermost base URL not configured (MM_URL)');
  const headers = Object.assign({ 'Content-Type': 'application/json' }, init.headers || {});
  if (MM_TOKEN) headers.Authorization = `Bearer ${MM_TOKEN}`;
  const res = await fetch(`${MM_BASE}${path}`, { ...init, headers });
  return res;
}

async function ensureTeamId() {
  if (cachedTeamId) return cachedTeamId;
  const r = await mmFetch(`/api/v4/teams/name/${MM_TEAM}`, { method: 'GET' });
  if (!r.ok) throw new Error(`Failed to fetch team '${MM_TEAM}': ${r.status}`);
  const j = await r.json();
  cachedTeamId = j.id;
  return cachedTeamId;
}

// Provision current ERP user into Mattermost (idempotent)
router.post('/provision', authenticate, async (req, res) => {
  try {
    if (!MM_BASE) return res.status(500).json({ ok: false, error: 'MM_URL not set' });
    const { user } = req.body || {};
    if (!user?.email) return res.status(400).json({ ok: false, error: 'email required' });
    const email = String(user.email).toLowerCase();
    const username = (email.split('@')[0] || 'user').replace(/[^a-z0-9._-]/g, '').slice(0,64) || `u${Date.now()}`;
    // Check if exists
    let existing = await mmFetch(`/api/v4/users/email/${encodeURIComponent(email)}`, { method: 'GET' });
    let created = false;
    let mmUser;
    if (existing.status === 404) {
      if (!MM_TOKEN) return res.status(500).json({ ok: false, error: 'MM_TOKEN not set for user creation' });
      const body = JSON.stringify({
        email,
        username,
        password: MM_DEFAULT_PASSWORD,
        first_name: user.name || username,
      });
      const cr = await mmFetch('/api/v4/users', { method: 'POST', body });
      if (!cr.ok) {
        const txt = await cr.text();
        return res.status(cr.status).json({ ok: false, error: 'create_failed', detail: txt });
      }
      mmUser = await cr.json();
      created = true;
    } else if (existing.ok) {
      mmUser = await existing.json();
    } else {
      const txt = await existing.text();
      return res.status(existing.status).json({ ok: false, error: 'lookup_failed', detail: txt });
    }
    // Ensure team membership
    let teamId;
    try { teamId = await ensureTeamId(); } catch (e) { return res.status(500).json({ ok: false, error: e.message }); }
    const memCheck = await mmFetch(`/api/v4/teams/${teamId}/members/${mmUser.id}`, { method: 'GET' });
    if (memCheck.status === 404) {
      // add
      await mmFetch(`/api/v4/teams/${teamId}/members`, { method: 'POST', body: JSON.stringify({ team_id: teamId, user_id: mmUser.id }) });
    }
    res.json({ ok: true, created, user: { id: mmUser.id, username: mmUser.username, email: mmUser.email }, team: MM_TEAM });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Login proxy for Mattermost (establish session cookies)
router.post('/login', authenticate, async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ ok: false, error: 'email & password required' });
    if (!MM_BASE) return res.status(500).json({ ok: false, error: 'MM_URL not set' });
    const lr = await fetch(`${MM_BASE}/api/v4/users/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
      body: JSON.stringify({ login_id: email, password })
    });
    if (!lr.ok) {
      const detail = await lr.text();
      return res.status(lr.status).json({ ok: false, error: 'login_failed', detail });
    }
    // Forward set-cookie headers
    const setCookie = lr.headers.get('set-cookie');
    if (setCookie) res.setHeader('set-cookie', setCookie);
    // Return user data
    const j = await lr.json();
    res.json({ ok: true, user: { id: j.id, username: j.username, email: j.email } });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

/**
 * ERP Query Endpoint - Main chatbot integration
 * POST /api/mattermost/query
 * 
 * Accepts natural language queries from Mattermost chatbot
 * Returns structured data from ERP database
 */
router.post('/query', authenticate, async (req, res) => {
  try {
    const { query, userId, intent, entities } = req.body;
    
    console.log('[Mattermost Bot] Query received:', {
      query,
      userId,
      intent,
      entityCount: entities?.length || 0
    });

    // Self-learning vocabulary interception ---------------------------------
    // Check for unknown term before normal intent processing.
    const candidateTerms = extractCandidateTerms(query || '');
    for (const term of candidateTerms) {
      const known = await lookupTerm(term, req.user.id);
      if (!known) {
        const suggestions = await suggestionsForTerm(term);
        const pendingId = await createPending(term, req.user.id, suggestions);
        const clarifyMessage = personaFormat(
          `I don't recognize the term "${term}" yet. Let's clarify it so I can help better.`,
          [
            'Review the 3 possible meanings below',
            'Reply with the option number (1-3) or a one-line definition',
            'Append ;public to share with everyone (optional)' ],
          'Send your reply now to save the definition'
        );
        return res.json({
          ok: true,
          intent: 'clarify_term',
          data: {
            type: 'clarify',
            term,
            suggestions,
            pendingId,
            message: clarifyMessage
          },
          timestamp: new Date().toISOString()
        });
      }
    }

    // Detect intent from query (only if no clarification needed)
    const detectedIntent = intent || detectIntent(query);
    
    // Route to appropriate handler
    let result;
    switch (detectedIntent) {
      case 'invoice_status':
        result = await handleInvoiceQuery(req.user, entities);
        break;
      case 'invoice_create':
        result = await handleInvoiceCreation(req.user);
        break;
      case 'leave_status':
        result = await handleLeaveQuery(req.user);
        break;
      case 'leave_apply':
        result = await handleLeaveApplication(req.user);
        break;
      case 'approval_pending':
        result = await handleApprovalQuery(req.user);
        break;
      case 'user_info':
        result = await handleUserInfo(req.user);
        break;
      case 'dashboard_stats':
        result = await handleDashboardStats(req.user);
        break;
      default:
        result = {
          type: 'info',
          message: 'I can help you with invoices, leaves, approvals, and more. What would you like to know?',
          suggestions: [
            'Show my recent invoices',
            'Check leave balance',
            'Pending approvals',
            'Create new invoice'
          ]
        };
    }

    // Response automatically compressed with Level 9 GZIP (from app.js)
    res.json({
      ok: true,
      intent: detectedIntent,
      data: result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[Mattermost Bot] Query error:', error);
    res.status(500).json({
      ok: false,
      error: 'Failed to process query',
      message: error.message
    });
  }
});

// ---------------------------------------------------------------------------
// POST /api/mattermost/vocab/confirm
// Body: { pendingId, reply } where reply = '1' | '2' | '3' | 'definition text[;public]' 
// ---------------------------------------------------------------------------
router.post('/vocab/confirm', authenticate, async (req, res) => {
  try {
    const { pendingId, reply } = req.body || {};
    if (!pendingId || !reply) return res.status(400).json({ ok:false, error:'pendingId and reply required' });
    const pending = await getPending(pendingId);
    if (!pending) return res.status(404).json({ ok:false, error:'pending_not_found' });
    if (pending.user_id !== req.user.id) return res.status(403).json({ ok:false, error:'not_owner' });
    let visibility = 'personal';
    let text = String(reply).trim();
    if (text.toLowerCase().endsWith(';public')) { visibility='public'; text=text.slice(0,-7).trim(); }
    let definition;
    const numeric = /^\d+$/.test(text);
    if (numeric) {
      const idx = parseInt(text,10)-1;
      if (idx < 0 || idx >= pending.suggestions.length) {
        return res.status(400).json({ ok:false, error:'invalid_option' });
      }
      definition = pending.suggestions[idx];
    } else {
      definition = text;
    }
    if (!definition) return res.status(400).json({ ok:false, error:'empty_definition' });
    if (containsPII(definition)) return res.status(400).json({ ok:false, error:'pii_detected', message:'Please redact emails, phone numbers, or secrets.' });
    await saveMapping(pending.term, definition, req.user.id, visibility);
    await deletePending(pending.id);
    const responseMessage = personaFormat(
      `Saved your definition for "${pending.term}" (${visibility}).`,
      [
        'I will use it in future answers',
        'Personal mappings override public ones',
        'You can edit by redefining the term later'
      ],
      'Ask a question using the term to see it applied'
    );
    res.json({ ok:true, saved:true, term: pending.term, visibility, message: responseMessage });
  } catch (e) {
    console.error('[mattermostBot] vocab confirm error:', e);
    res.status(500).json({ ok:false, error:'server_error', message: e.message });
  }
});

// GET /api/mattermost/system-prompt - returns final system prompt & config defaults
router.get('/system-prompt', authenticate, async (req, res) => {
  try {
    const checklist = {
      db_table_vocab: 'vocab(id, term, definition, normalized_term, user_id, visibility, created_at, updated_at)',
      db_table_vocab_pending: 'vocab_pending(id, term, normalized_term, user_id, suggestions, created_at)',
      default_visibility: 'personal',
      max_suggestions: 3,
      precedence: 'personal before public',
      auto_public_suggest_after_n: 0,
      pii_policy: 'refuse storing emails, phone numbers (7+ digits), credentials',
      public_confirmation_text: 'Reply yes to confirm or no to keep it personal.'
    };
    res.json({ ok:true, systemPrompt: SYSTEM_PROMPT_TEXT, config: checklist });
  } catch (e) {
    res.status(500).json({ ok:false, error:e.message });
  }
});

/**
 * Invoice Query Handler
 * Returns user's recent invoices with status
 */
async function handleInvoiceQuery(user, entities) {
  try {
    // Get user's recent invoices
    const invoices = await prisma.invoice.findMany({
      where: {
        user_id: user.id,
        ...(user.tenant_id && { tenant_id: user.tenant_id })
      },
      orderBy: { created_at: 'desc' },
      take: 5,
      select: {
        id: true,
        invoice_number: true,
        total_amount: true,
        status: true,
        due_date: true,
        created_at: true
      }
    });

    if (invoices.length === 0) {
      return {
        type: 'info',
        message: '📝 You have no invoices yet.',
        action: 'Would you like to create a new invoice?'
      };
    }

    // Calculate totals
    const totalAmount = invoices.reduce((sum, inv) => sum + parseFloat(inv.total_amount || 0), 0);
    const paidCount = invoices.filter(inv => inv.status === 'paid').length;
    const pendingCount = invoices.filter(inv => inv.status === 'pending').length;

    return {
      type: 'invoice_list',
      message: `📊 **Your Recent Invoices**\n\nTotal: ${invoices.length} invoices | Paid: ${paidCount} | Pending: ${pendingCount}\nTotal Amount: ₹${totalAmount.toFixed(2)}`,
      invoices: invoices.map(inv => ({
        id: inv.id,
        number: inv.invoice_number,
        amount: `₹${parseFloat(inv.total_amount).toFixed(2)}`,
        status: inv.status,
        dueDate: inv.due_date?.toISOString().split('T')[0],
        createdAt: inv.created_at?.toISOString().split('T')[0]
      })),
      summary: {
        total: invoices.length,
        paid: paidCount,
        pending: pendingCount,
        totalAmount: totalAmount.toFixed(2)
      }
    };
  } catch (error) {
    console.error('[Invoice Query] Error:', error);
    return {
      type: 'error',
      message: '❌ Failed to fetch invoices. Please try again.'
    };
  }
}

/**
 * Invoice Creation Helper
 * Provides guidance for creating invoices
 */
async function handleInvoiceCreation(user) {
  return {
    type: 'guide',
    message: `📝 **Create New Invoice**\n\nHere's how to create an invoice:\n\n1. Go to Finance Module 💰\n2. Click "Billing" → "New Invoice"\n3. Fill in customer details\n4. Add line items\n5. Review and save\n\n**Quick Link:** [Create Invoice](${process.env.FRONTEND_URL}/finance/invoices/new)`,
    action: 'Open invoice creation form',
    url: '/finance/invoices/new'
  };
}

/**
 * Leave Query Handler
 * Returns user's leave balance and recent requests
 */
async function handleLeaveQuery(user) {
  try {
    // Get user's leave requests
    const leaveRequests = await prisma.leaveRequest.findMany({
      where: {
        user_id: user.id,
        ...(user.tenant_id && { tenant_id: user.tenant_id })
      },
      orderBy: { created_at: 'desc' },
      take: 5,
      select: {
        id: true,
        leave_type: true,
        start_date: true,
        end_date: true,
        status: true,
        days_count: true,
        created_at: true
      }
    });

    // Calculate leave balance (mock data - replace with actual logic)
    const leaveBalance = {
      total: 24,
      used: leaveRequests.filter(lr => lr.status === 'approved').reduce((sum, lr) => sum + (lr.days_count || 0), 0),
      pending: leaveRequests.filter(lr => lr.status === 'pending').length
    };
    leaveBalance.remaining = leaveBalance.total - leaveBalance.used;

    if (leaveRequests.length === 0) {
      return {
        type: 'leave_balance',
        message: `🏖️ **Your Leave Balance**\n\nTotal: ${leaveBalance.total} days\nUsed: ${leaveBalance.used} days\nRemaining: ${leaveBalance.remaining} days\n\nYou haven't applied for any leaves yet.`,
        balance: leaveBalance
      };
    }

    const approvedCount = leaveRequests.filter(lr => lr.status === 'approved').length;
    const pendingCount = leaveRequests.filter(lr => lr.status === 'pending').length;
    const rejectedCount = leaveRequests.filter(lr => lr.status === 'rejected').length;

    return {
      type: 'leave_list',
      message: `🏖️ **Your Leave Status**\n\nBalance: ${leaveBalance.remaining}/${leaveBalance.total} days remaining\n\nRecent Requests:\n✅ Approved: ${approvedCount} | ⏳ Pending: ${pendingCount} | ❌ Rejected: ${rejectedCount}`,
      requests: leaveRequests.map(lr => ({
        id: lr.id,
        type: lr.leave_type,
        startDate: lr.start_date?.toISOString().split('T')[0],
        endDate: lr.end_date?.toISOString().split('T')[0],
        days: lr.days_count,
        status: lr.status
      })),
      balance: leaveBalance
    };
  } catch (error) {
    console.error('[Leave Query] Error:', error);
    return {
      type: 'error',
      message: '❌ Failed to fetch leave data. Please try again.'
    };
  }
}

/**
 * Leave Application Helper
 */
async function handleLeaveApplication(user) {
  return {
    type: 'guide',
    message: `🏖️ **Apply for Leave**\n\nSteps to apply:\n\n1. Go to HR Module 👥\n2. Click "Leave" → "New Request"\n3. Select leave type (Casual/Sick/Vacation)\n4. Choose dates\n5. Add reason\n6. Submit for approval\n\n**Quick Link:** [Apply Leave](${process.env.FRONTEND_URL}/hr/leave/apply)`,
    action: 'Open leave application form',
    url: '/hr/leave/apply'
  };
}

/**
 * Approval Query Handler
 * Returns pending approvals for the user
 */
async function handleApprovalQuery(user) {
  try {
    // Get pending approvals (if user is approver)
    const pendingApprovals = await prisma.approval.findMany({
      where: {
        approver_id: user.id,
        status: 'pending',
        ...(user.tenant_id && { tenant_id: user.tenant_id })
      },
      orderBy: { created_at: 'desc' },
      take: 10,
      select: {
        id: true,
        approval_type: true,
        request_id: true,
        requester_id: true,
        amount: true,
        description: true,
        created_at: true
      }
    });

    if (pendingApprovals.length === 0) {
      return {
        type: 'info',
        message: '✅ **No Pending Approvals**\n\nYou have no pending approvals at the moment.',
        action: 'All caught up! 🎉'
      };
    }

    // Categorize by type
    const byType = {};
    pendingApprovals.forEach(approval => {
      const type = approval.approval_type || 'other';
      if (!byType[type]) byType[type] = [];
      byType[type].push(approval);
    });

    const summary = Object.entries(byType).map(([type, items]) => 
      `${type}: ${items.length}`
    ).join(' | ');

    return {
      type: 'approval_list',
      message: `⏳ **Pending Approvals (${pendingApprovals.length})**\n\n${summary}\n\nPlease review and approve/reject.`,
      approvals: pendingApprovals.map(app => ({
        id: app.id,
        type: app.approval_type,
        requestId: app.request_id,
        amount: app.amount ? `₹${parseFloat(app.amount).toFixed(2)}` : null,
        description: app.description,
        createdAt: app.created_at?.toISOString().split('T')[0]
      })),
      summary: {
        total: pendingApprovals.length,
        byType: byType
      }
    };
  } catch (error) {
    console.error('[Approval Query] Error:', error);
    return {
      type: 'error',
      message: '❌ Failed to fetch approvals. Please try again.'
    };
  }
}

/**
 * User Info Handler
 */
async function handleUserInfo(user) {
  return {
    type: 'user_info',
    message: `👤 **Your Profile**\n\nName: ${user.username || user.email}\nEmail: ${user.email}\nRole: ${user.role}\n\nLast Login: ${new Date().toLocaleString()}`,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role
    }
  };
}

/**
 * Dashboard Stats Handler
 */
async function handleDashboardStats(user) {
  try {
    // Get various counts
    const [invoiceCount, leaveCount, approvalCount] = await Promise.all([
      prisma.invoice.count({ where: { user_id: user.id } }),
      prisma.leaveRequest.count({ where: { user_id: user.id } }),
      prisma.approval.count({ where: { approver_id: user.id, status: 'pending' } })
    ]);

    return {
      type: 'dashboard',
      message: `📊 **Your Dashboard**\n\n📝 Invoices: ${invoiceCount}\n🏖️ Leave Requests: ${leaveCount}\n⏳ Pending Approvals: ${approvalCount}`,
      stats: {
        invoices: invoiceCount,
        leaves: leaveCount,
        approvals: approvalCount
      }
    };
  } catch (error) {
    console.error('[Dashboard Stats] Error:', error);
    return {
      type: 'error',
      message: '❌ Failed to fetch dashboard stats.'
    };
  }
}

/**
 * Intent Detection Helper
 * Analyzes query to determine user intent
 */
function detectIntent(query) {
  const lowerQuery = query.toLowerCase();
  
  // Invoice related
  if (lowerQuery.includes('invoice') && (lowerQuery.includes('show') || lowerQuery.includes('list') || lowerQuery.includes('recent'))) {
    return 'invoice_status';
  }
  if (lowerQuery.includes('invoice') && (lowerQuery.includes('create') || lowerQuery.includes('new'))) {
    return 'invoice_create';
  }
  
  // Leave related
  if (lowerQuery.includes('leave') && (lowerQuery.includes('balance') || lowerQuery.includes('remaining') || lowerQuery.includes('status'))) {
    return 'leave_status';
  }
  if (lowerQuery.includes('leave') && (lowerQuery.includes('apply') || lowerQuery.includes('request'))) {
    return 'leave_apply';
  }
  
  // Approval related
  if (lowerQuery.includes('approval') || lowerQuery.includes('pending') || lowerQuery.includes('approve')) {
    return 'approval_pending';
  }
  
  // User info
  if (lowerQuery.includes('profile') || lowerQuery.includes('my info') || lowerQuery.includes('who am i')) {
    return 'user_info';
  }
  
  // Dashboard
  if (lowerQuery.includes('dashboard') || lowerQuery.includes('summary') || lowerQuery.includes('overview')) {
    return 'dashboard_stats';
  }
  
  return 'unknown';
}

/**
 * Webhook Endpoint for Mattermost Events
 * POST /api/mattermost/webhook
 */
router.post('/webhook', async (req, res) => {
  try {
    const { event, user_id, channel_id, message } = req.body;
    
    console.log('[Mattermost Webhook] Event received:', {
      event,
      userId: user_id,
      channelId: channel_id,
      message: message?.substring(0, 50)
    });

    // Process webhook event
    // This can be used for real-time notifications, etc.
    
    res.json({ ok: true, processed: true });
  } catch (error) {
    console.error('[Mattermost Webhook] Error:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

/**
 * Health Check Endpoint
 * GET /api/mattermost/health
 */
router.get('/health', (req, res) => {
  res.json({
    ok: true,
    service: 'Mattermost Bot Integration',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    features: [
      'Invoice queries',
      'Leave management',
      'Approval tracking',
      'User information',
  'Dashboard stats',
  'Self-learning vocabulary',
  'Persona responses',
  'Term clarification flow'
    ]
  });
});

module.exports = router;
