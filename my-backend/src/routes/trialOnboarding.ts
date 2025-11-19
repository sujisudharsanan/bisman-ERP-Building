import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const router = Router();
const prisma = new PrismaClient();
// Cast variant to access not-yet-generated delegates/fields (temporary until migration & generate run)
const prismaAny = prisma as any;
// Simple in-memory rate limiting store { key: { count, first } }
const rateStore: Record<string,{count:number;first:number}> = {};
const RATE_LIMIT = 30; // requests
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

function checkRateLimit(ip: string, path: string) {
  const key = ip + '|' + path;
  const now = Date.now();
  const entry = rateStore[key];
  if (!entry) { rateStore[key] = { count: 1, first: now }; return true; }
  if (now - entry.first > WINDOW_MS) { rateStore[key] = { count: 1, first: now }; return true; }
  entry.count += 1;
  return entry.count <= RATE_LIMIT;
}

// --- Utility Validators ---
function isValidEmail(e?: string) {
  return !!e && /^(?=.{5,150}$)[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e);
}
function isStrongPassword(p?: string) {
  return !!p && /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[!@#$%^&*()_+\-={}\[\]:;"'<>,.?/]).{10,}$/.test(p);
}
// GSTIN (15 chars alphanumeric) or PAN (10 chars alphanumeric) simplified validation
function isValidTaxId(id?: string) {
  if (!id) return true; // optional at trial
  const s = id.trim().toUpperCase();
  return /^[A-Z0-9]{10,15}$/.test(s);
}
function sanitizeString(s?: string) {
  return (s || '').replace(/[\n\r\t]/g, ' ').trim();
}
function detectTimezone(tzHeader?: string) {
  if (tzHeader && tzHeader.length < 100) return tzHeader;
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { return 'UTC'; }
}

// --- Activity Log Helper ---
async function logActivity(clientId: string, step: string, action: string, meta: any = {}, actorEmail?: string) {
  try {
    if (prismaAny.clientOnboardingActivity) {
      await prismaAny.clientOnboardingActivity.create({
        data: { client_id: clientId, step_key: step, action, meta, actor_email: actorEmail }
      });
    } else {
      // Fallback: append to settings.enterprise.activity_log JSON
      const client = await prisma.client.findUnique({ where: { id: clientId } });
      if (client) {
        const settings: any = client.settings || {}; const enterprise = settings.enterprise || {}; const log: any[] = enterprise.activity_log || [];
        log.unshift({ ts: new Date().toISOString(), step, action, meta, actorEmail });
        enterprise.activity_log = log.slice(0, 100); // cap
        settings.enterprise = enterprise;
        await prisma.client.update({ where: { id: clientId }, data: { settings } });
      }
    }
  } catch (e) {
    console.warn('onboarding activity log failed', (e as any)?.message);
  }
}

// --- Public Trial Onboarding (Initial Create or Draft Update) ---
router.post('/public/onboarding/trial', async (req: Request, res: Response) => {
  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || 'unknown';
  if (!checkRateLimit(ip, 'trial_create')) return res.status(429).json({ error: 'rate_limited' });
  const { full_name, work_email, mobile_number, company_name, country, timezone, password, confirm_password, enable_mfa, industry, purpose, expected_volume, preferred_currency, enable_modules, preferred_language, consent_terms, consent_privacy, save_as_draft, draft_client_id } = req.body || {};
  // Optional simple CAPTCHA: client sends captcha_answer equals reversed full_name first 3 letters (demo only). Replace with real service later.
  const captchaAnswer = (req.body || {}).captcha_answer;
  if (!save_as_draft) {
    if (!captchaAnswer || typeof full_name === 'string' && full_name.slice(0,3).split('').reverse().join('') !== captchaAnswer) {
      return res.status(400).json({ error: 'captcha_failed' });
    }
  }
  try {
    // Basic required validations (unless saving as draft without email/password yet)
    if (!save_as_draft) {
      if (!full_name || !isValidEmail(work_email) || !password || !confirm_password) {
        return res.status(400).json({ error: 'full_name, work_email, password, confirm_password required' });
      }
      if (password !== confirm_password) return res.status(400).json({ error: 'password_mismatch' });
      if (!isStrongPassword(password)) return res.status(400).json({ error: 'weak_password' });
      if (!consent_terms || !consent_privacy) return res.status(400).json({ error: 'consent_required' });
    }

    // Currency auto-select fallback
    const currency = preferred_currency || (country === 'India' ? 'INR' : country === 'United States' ? 'USD' : 'USD');
    const trialStart = new Date();
    const trialEnd = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
    const modulesEnabled = Array.isArray(enable_modules) ? enable_modules : [];
    const tz = timezone || detectTimezone(req.headers['x-timezone'] as string);

    if (draft_client_id) {
      // Update existing draft client settings
      const existing = await prisma.client.findUnique({ where: { id: draft_client_id } });
      if (!existing) return res.status(404).json({ error: 'draft_client_not_found' });
      const updated = await prisma.client.update({
        where: { id: draft_client_id },
        data: {
          // Store interim draft meta inside settings.enterprise until schema migration applied
          settings: {
            ...(existing.settings as any || {}),
            enterprise: {
              ...((existing.settings as any)?.enterprise || {}),
              draft: {
                company_name: sanitizeString(company_name) || null,
                status: save_as_draft ? 'draft' : 'in_progress',
                preferred_language: preferred_language || null,
                timezone: tz,
                modules_enabled: modulesEnabled,
                notification_prefs: { email: true },
                updated_at: new Date().toISOString()
              }
            }
          } as any
        } as any
      });
      await logActivity(updated.id, 'trial', save_as_draft ? 'autosaved' : 'updated', { draft: true });
      return res.json({ success: true, draft: true, client_id: updated.id });
    }

    // Create new trial client (inactive until email verification optionally performed)
    const created = await prisma.client.create({
      data: {
        name: sanitizeString(company_name || full_name || 'Trial'),
        productType: 'BUSINESS_ERP',
        subscriptionPlan: 'free',
        subscriptionStatus: 'active',
        super_admin_id: await resolveDefaultSuperAdminId(),
        is_active: false,
        settings: {
          enterprise: {
            status: 'trial',
            meta: { purpose, expected_volume, trial: true },
            draft: {
              company_name: sanitizeString(company_name) || null,
              status: save_as_draft ? 'draft' : 'in_progress',
              trial_start_date: trialStart.toISOString(),
              trial_end_date: trialEnd.toISOString(),
              modules_enabled: modulesEnabled,
              preferred_language: preferred_language || 'en',
              timezone: tz,
              mfa_enabled: !!enable_mfa,
            }
          }
        } as any
      } as any
    });

    await logActivity(created.id, 'trial', save_as_draft ? 'created_draft' : 'created', { modules: modulesEnabled });

    // Issue magic link if not draft
    let magicLink: string | null = null;
    if (!save_as_draft && isValidEmail(work_email)) {
      magicLink = await issueMagicLink(created.id, work_email, req);
    }

    return res.status(201).json({ success: true, client_id: created.id, trial_end: trialEnd.toISOString(), magic_link: magicLink });
  } catch (e: any) {
    console.error('trial_onboarding_error', e);
    return res.status(500).json({ error: 'trial_onboarding_failed', details: e.message });
  }
});

// Issue or re-issue magic link (public)
router.post('/public/onboarding/trial/magic-link', async (req: Request, res: Response) => {
  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || 'unknown';
  if (!checkRateLimit(ip, 'trial_magic_link')) return res.status(429).json({ error: 'rate_limited' });
  const { client_id, email } = req.body || {};
  try {
    if (!client_id || !isValidEmail(email)) return res.status(400).json({ error: 'client_id & valid email required' });
    const client = await prisma.client.findUnique({ where: { id: client_id } });
    if (!client) return res.status(404).json({ error: 'client_not_found' });
    const link = await issueMagicLink(client_id, email, req);
    await logActivity(client_id, 'trial', 'magic_link_issued', { email });
    res.json({ success: true, magic_link: link });
  } catch (e: any) {
    console.error('magic_link_issue_error', e);
    res.status(500).json({ error: 'magic_link_failed', details: e.message });
  }
});

// Resume via magic link (public GET token param) - token raw provided, hashed stored
router.get('/public/onboarding/trial/resume/:token', async (req: Request, res: Response) => {
  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || 'unknown';
  if (!checkRateLimit(ip, 'trial_resume')) return res.status(429).json({ error: 'rate_limited' });
  try {
    const rawToken = req.params.token;
    if (!rawToken || rawToken.length < 32) return res.status(400).json({ error: 'invalid_token' });
    const hash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const record = await prismaAny.onboardingMagicLink?.findFirst({ where: { token_hash: hash, used_at: null, expires_at: { gt: new Date() } } });
    if (!record) return res.status(404).json({ error: 'token_not_found_or_expired' });
    if (!record.client_id) return res.status(400).json({ error: 'client_id_missing' });
    const client = await prisma.client.findUnique({ where: { id: record.client_id } });
    if (!client) return res.status(404).json({ error: 'client_not_found' });
    // Mark used (single use) but allow multiple resume requests by not setting used_at until completion step maybe; keep single-use for now.
    if (prismaAny.onboardingMagicLink) {
      await prismaAny.onboardingMagicLink.update({ where: { id: record.id }, data: { used_at: new Date() } });
    }
    await logActivity(client.id, 'trial', 'resume', { token_id: record.id });
  const draft = (client.settings as any)?.enterprise?.draft || {};
  return res.json({ success: true, client_id: client.id, onboarding_status: draft.status, trial_end_date: draft.trial_end_date });
  } catch (e: any) {
    console.error('resume_magic_link_error', e);
    return res.status(500).json({ error: 'resume_failed', details: e.message });
  }
});

// Activity list (protected minimal - could add auth later, currently read-only public for demonstration with token param future)
// Minimal status fetch for prefill (public)
router.get('/public/onboarding/trial/:clientId/minimal', async (req: Request, res: Response) => {
  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || 'unknown';
  if (!checkRateLimit(ip, 'trial_minimal')) return res.status(429).json({ error: 'rate_limited' });
  try {
    const { clientId } = req.params;
    const client = await prisma.client.findUnique({ where: { id: clientId } });
    if (!client) return res.status(404).json({ error: 'not_found' });
    const draft = (client.settings as any)?.enterprise?.draft || {};
    res.json({ success: true, data: { id: client.id, trial_end_date: draft.trial_end_date || null, onboarding_status: draft.status || null, company_name: draft.company_name || null } });
  } catch (e: any) {
    res.status(500).json({ error: 'minimal_fetch_failed', details: e.message });
  }
});

// Activity list (public demo) - uses JSON fallback if model not present
router.get('/public/onboarding/trial/activity/:clientId', async (req: Request, res: Response) => {
  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || 'unknown';
  if (!checkRateLimit(ip, 'trial_activity')) return res.status(429).json({ error: 'rate_limited' });
  try {
    const { clientId } = req.params;
    if (prismaAny.clientOnboardingActivity) {
      const items = await prismaAny.clientOnboardingActivity.findMany({ where: { client_id: clientId }, orderBy: { created_at: 'desc' }, take: 50 });
      return res.json({ success: true, data: items });
    }
    const client = await prisma.client.findUnique({ where: { id: clientId } });
    if (!client) return res.status(404).json({ error: 'not_found' });
    const log = (client.settings as any)?.enterprise?.activity_log || [];
    res.json({ success: true, data: log });
  } catch (e: any) {
    res.status(500).json({ error: 'activity_fetch_failed', details: e.message });
  }
});

// --- Helpers ---
async function resolveDefaultSuperAdminId(): Promise<number> {
  try {
    const count = await prisma.superAdmin.count();
    if (count === 1) {
      const only = await prisma.superAdmin.findFirst();
      if (only?.id) return only.id;
    }
    // fallback: pick first active
    const any = await prisma.superAdmin.findFirst({ where: { is_active: true } });
    if (any?.id) return any.id;
  } catch {}
  // Hard fallback (should not happen in prod) - return 1
  return 1;
}

async function issueMagicLink(clientId: string, email: string, req: Request): Promise<string> {
  const raw = crypto.randomBytes(32).toString('hex');
  const hash = crypto.createHash('sha256').update(raw).digest('hex');
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h
  if (prismaAny.onboardingMagicLink) {
    await prismaAny.onboardingMagicLink.create({
    data: {
      client_id: clientId,
      email,
      token_hash: hash,
      expires_at: expires,
      created_ip: (req.headers['x-forwarded-for'] as string) || req.ip || undefined,
      user_agent: req.headers['user-agent'] || undefined,
    }
    });
  } else {
    // Fallback: store token meta in settings.enterprise.magic_links
    const client = await prisma.client.findUnique({ where: { id: clientId } });
    if (client) {
      const settings: any = client.settings || {}; const enterprise = settings.enterprise || {}; const ml: any[] = enterprise.magic_links || [];
      ml.unshift({ email, token_hash: hash, expires_at: expires.toISOString(), created_at: new Date().toISOString() });
      enterprise.magic_links = ml.slice(0, 10);
      settings.enterprise = enterprise;
      await prisma.client.update({ where: { id: clientId }, data: { settings } });
    }
  }
  // Raw token returned once; consumer builds full URL on frontend
  return raw;
}

export default router;
