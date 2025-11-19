import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../../middleware/auth';
import { isTenantAdmin } from '../constants/roles';

const router = Router();
const prisma = new PrismaClient();

// Record a usage event
router.post('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { event_type, module_id, meta } = req.body;
    if (!event_type) return res.status(400).json({ error: 'event_type required' });
    if (!user?.tenant_id) return res.status(400).json({ error: 'tenant_id missing on user' });
    const created = await prisma.UsageEvent.create({
      data: {
        event_type,
        module_id: module_id ? Number(module_id) : null,
        user_id: user.id,
        client_id: user.tenant_id,
        meta: meta || null,
      },
    });
    res.status(201).json({ success: true, data: created });
  } catch (e: any) {
    console.error('Record usage event error', e);
    res.status(500).json({ error: 'Failed to record event', details: e.message });
  }
});

// Simple aggregation (last 24h counts by event_type)
router.get('/summary', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user?.tenant_id) return res.status(400).json({ error: 'tenant_id missing on user' });
    const since = new Date(Date.now() - 24 * 3600 * 1000);
    const raw = await prisma.UsageEvent.findMany({
      where: { client_id: user.tenant_id, occurred_at: { gte: since } },
      select: { event_type: true },
    });
    const counts: Record<string, number> = {};
    for (const r of raw) counts[r.event_type] = (counts[r.event_type] || 0) + 1;
    res.json({ success: true, data: counts, window_hours: 24 });
  } catch (e: any) {
    console.error('Usage summary error', e);
    res.status(500).json({ error: 'Failed to fetch usage summary', details: e.message });
  }
});

export default router;
