import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Roles
  const roles = await prisma.role.createMany({
    data: [
      { key: 'SUPER_ADMIN', name: 'Super Admin' },
      { key: 'ENTERPRISE_ADMIN', name: 'Enterprise Admin' },
      { key: 'ORG_ADMIN', name: 'Organization Admin' },
      { key: 'ORG_USER', name: 'Organization User' },
    ],
    skipDuplicates: true,
  });

  // Users
  const password = await bcrypt.hash('Password@123', 10);
  const superAdmin = await prisma.user.upsert({
    where: { email: 'super@erp.local' },
    update: {},
    create: { email: 'super@erp.local', name: 'Super Admin', password },
  });
  const enterpriseAdmin = await prisma.user.upsert({
    where: { email: 'enterprise@erp.local' },
    update: {},
    create: { email: 'enterprise@erp.local', name: 'Enterprise Admin', password },
  });

  // Attach roles
  const superRole = await prisma.role.findUnique({ where: { key: 'SUPER_ADMIN' } });
  const entRole = await prisma.role.findUnique({ where: { key: 'ENTERPRISE_ADMIN' } });
  const orgAdminRole = await prisma.role.findUnique({ where: { key: 'ORG_ADMIN' } });
  const orgUserRole = await prisma.role.findUnique({ where: { key: 'ORG_USER' } });

  if (superRole) await prisma.userRole.upsert({ where: { id: `${superAdmin.id}-${superRole.id}` }, update: {}, create: { userId: superAdmin.id, roleId: superRole.id } });
  if (entRole) await prisma.userRole.upsert({ where: { id: `${enterpriseAdmin.id}-${entRole.id}` }, update: {}, create: { userId: enterpriseAdmin.id, roleId: entRole.id } });

  // Orgs
  const orgA = await prisma.organization.upsert({
    where: { slug: 'alpha-corp' },
    update: {},
    create: { name: 'Alpha Corp', slug: 'alpha-corp', description: 'Tenant Alpha' },
  });
  const orgB = await prisma.organization.upsert({
    where: { slug: 'beta-inc' },
    update: {},
    create: { name: 'Beta Inc', slug: 'beta-inc', description: 'Tenant Beta' },
  });

  // Org users
  const orgAdmin = await prisma.user.upsert({
    where: { email: 'admin@alpha.local' },
    update: {},
    create: { email: 'admin@alpha.local', name: 'Alpha Admin', password },
  });
  const orgUser = await prisma.user.upsert({
    where: { email: 'user@alpha.local' },
    update: {},
    create: { email: 'user@alpha.local', name: 'Alpha User', password },
  });

  if (orgAdminRole) await prisma.userRole.create({ data: { userId: orgAdmin.id, roleId: orgAdminRole.id } });
  if (orgUserRole) await prisma.userRole.create({ data: { userId: orgUser.id, roleId: orgUserRole.id } });

  await prisma.membership.createMany({ data: [
    { userId: orgAdmin.id, organizationId: orgA.id, roleId: orgAdminRole!.id },
    { userId: orgUser.id, organizationId: orgA.id, roleId: orgUserRole!.id },
  ], skipDuplicates: true });

  // Modules
  const modules = await prisma.module.createMany({ data: [
    { key: 'BILLING', name: 'Billing' },
    { key: 'REPORTS', name: 'Reports' },
    { key: 'INTEGRATIONS', name: 'Integrations' },
    { key: 'AI_AUTOMATION', name: 'AI & Automation' },
  ], skipDuplicates: true });

  const billing = await prisma.module.findUnique({ where: { key: 'BILLING' } });
  if (billing) await prisma.orgsEnabled.create({ data: { orgId: orgA.id, moduleId: billing.id, enabled: true } });

  // Subscriptions
  await prisma.subscription.upsert({ where: { organizationId: orgA.id }, update: {}, create: { organizationId: orgA.id, plan: 'pro' } });
  await prisma.subscription.upsert({ where: { organizationId: orgB.id }, update: {}, create: { organizationId: orgB.id, plan: 'starter' } });

  console.log('Seed complete');
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(async () => { await prisma.$disconnect(); });
