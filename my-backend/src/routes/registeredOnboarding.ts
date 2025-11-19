import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../../middleware/auth';
import { isPlatformAdmin, isTenantAdmin } from '../constants/roles';

const router = Router();
const prisma = new PrismaClient();
const prismaAny: any = prisma;

// Create or update a registered onboarding draft snapshot
router.post('/system/onboarding/registered/draft', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const role = user?.role;
    if (!isPlatformAdmin(role) && !isTenantAdmin(role) && role !== 'SUPER_ADMIN' && role !== 'ADMIN') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const { client_id, state } = req.body || {};
    if (!state?.identification?.legal_name && !state?.identification?.trade_name) {
      return res.status(400).json({ error: 'legal_or_trade_name_required' });
    }
    if (client_id) {
      const existing = await prisma.client.findUnique({ where: { id: client_id } });
      if (!existing) return res.status(404).json({ error: 'client_not_found' });
      // Merge into enterprise settings JSON
      const raw: any = existing.settings || {}; const enterprise: any = raw.enterprise || raw || {};
      enterprise.draft = { ...(enterprise.draft || {}), state }; // store full snapshot
      const updated = await prisma.client.update({ where: { id: client_id }, data: { settings: { enterprise } as any } });
      await prismaAny.clientOnboardingActivity.create({ data: { client_id, step_key: 'draft', action: 'update', meta: { snapshot: true }, actor_email: user?.email || undefined } });
      return res.json({ success: true, client_id: updated.id });
    }
    // create new draft client (store everything in settings.enterprise)
    const enterprise: any = { legal_name: state.identification.legal_name, trade_name: state.identification.trade_name, status: 'draft', meta: { draft: true }, draft: { state } };
    const created = await prisma.client.create({ data: { name: state.identification.legal_name || state.identification.trade_name, productType: 'BUSINESS_ERP', subscriptionPlan: 'free', subscriptionStatus: 'active', super_admin_id: await resolveDefaultSuperAdminId(), is_active: false, settings: { enterprise } as any } });
    await prismaAny.clientOnboardingActivity.create({ data: { client_id: created.id, step_key: 'draft', action: 'create', meta: { snapshot: true }, actor_email: user?.email || undefined } });
    res.status(201).json({ success: true, client_id: created.id });
  } catch (e: any) {
    console.error('registered_onboarding_draft_error', e);
    res.status(500).json({ error: 'draft_save_failed', details: e.message });
  }
});

async function resolveDefaultSuperAdminId(): Promise<number> {
  try {
    const count = await prisma.superAdmin.count();
    if (count === 1) {
      const only = await prisma.superAdmin.findFirst();
      if (only?.id) return only.id;
    }
    const any = await prisma.superAdmin.findFirst({ where: { is_active: true } });
    if (any?.id) return any.id;
  } catch {}
  return 1;
}

export default router;
