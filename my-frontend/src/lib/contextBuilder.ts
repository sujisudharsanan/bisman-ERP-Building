import { prisma } from '@/lib/prisma';

export type BuiltContext = {
  userId: string;
  role: string;
  allowedModules: string[];
  snippets: { sourceId: string; chunkIndex: number; text: string }[];
};

/**
 * Build AI context for a user by:
 * - Loading user's role and allowedModules
 * - Pulling RAG sources filtered by tags ∩ allowedModules
 * - Returning top-N snippets (ordered by recency and chunk order)
 */
export async function buildContext(userId: string, topN = 8): Promise<BuiltContext> {
  // Load user with role (first role) and allowedModules by role
  const roles = await prisma.userRole.findMany({ where: { userId }, include: { role: true } });
  const role = roles[0]?.role?.key || 'ORG_USER';
  const roleRow = roles[0]?.role;

  let allowed: string[] = [];
  if (roleRow) {
    const am = await (prisma as any).allowedModule.findMany({ where: { roleId: roleRow.id } });
    allowed = am.map((x: any) => x.moduleKey);
  }

  // Pull sources tagged with any allowed module; newest first
  const sources = await (prisma as any).ragSource.findMany({ orderBy: { createdAt: 'desc' } });
  const filtered = sources.filter((s: any) => !allowed.length || s.tags.some((t: string) => allowed.includes(t)));

  // Join embeddings (lightweight selection)
  const snippets: { sourceId: string; chunkIndex: number; text: string }[] = [];
  for (const s of filtered) {
  const embs = await (prisma as any).embedding.findMany({ where: { sourceId: s.id }, orderBy: { chunkIndex: 'asc' }, take: topN });
    for (const e of embs) {
      // For this scaffold, we don't persist the raw text; retrieve from file on demand is expensive.
      // We’ll store a placeholder text marker to indicate chunk origin.
      snippets.push({ sourceId: s.id, chunkIndex: e.chunkIndex, text: `[chunk ${e.chunkIndex} from ${s.fileName}]` });
      if (snippets.length >= topN) break;
    }
    if (snippets.length >= topN) break;
  }

  return { userId, role, allowedModules: allowed, snippets };
}
