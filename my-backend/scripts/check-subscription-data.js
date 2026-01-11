/**
 * Check subscription data in database
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    // Check subscriptions
    const subs = await prisma.client_subscriptions.findMany({
      include: { plan: true, client: true },
      take: 10
    });
    console.log('=== Client Subscriptions (first 10) ===');
    if (subs.length === 0) {
      console.log('No client_subscriptions found!');
    }
    subs.forEach(s => {
      console.log(`Client: ${s.client?.name || s.client_id} | Plan: ${s.plan?.name || 'NO PLAN'} | State: ${s.state} | Users: ${s.current_user_count}`);
    });

    // Check users_enhanced
    console.log('\n=== User counts by tenant (users_enhanced) ===');
    const userCounts = await prisma.users_enhanced.groupBy({
      by: ['tenant_id'],
      _count: true
    });
    if (userCounts.length === 0) {
      console.log('No users in users_enhanced!');
    }
    userCounts.forEach(u => console.log(`Tenant ${u.tenant_id}: ${u._count} users`));

    // Check User table as well
    console.log('\n=== User counts by clientId (User table) ===');
    const userCounts2 = await prisma.user.groupBy({
      by: ['clientId'],
      _count: true
    });
    if (userCounts2.length === 0) {
      console.log('No users in User table!');
    }
    userCounts2.forEach(u => console.log(`Client ${u.clientId}: ${u._count} users`));

    // Check subscription_plans
    console.log('\n=== Subscription Plans ===');
    const plans = await prisma.subscription_plans.findMany();
    if (plans.length === 0) {
      console.log('No subscription_plans found!');
    }
    plans.forEach(p => console.log(`${p.plan_code}: max_users=${p.max_users}, name=${p.name}`));

    // Check clients table
    console.log('\n=== Clients (first 5) ===');
    const clients = await prisma.clients.findMany({
      take: 5,
      include: {
        subscription: {
          include: { plan: true }
        }
      }
    });
    if (clients.length === 0) {
      console.log('No clients found!');
    }
    clients.forEach(c => {
      console.log(`ID: ${c.id} | Name: ${c.name} | subscriptionPlan: ${c.subscriptionPlan} | has client_subscription: ${!!c.subscription}`);
      if (c.subscription) {
        console.log(`  -> Plan: ${c.subscription.plan?.name}, State: ${c.subscription.state}`);
      }
    });

  } catch (e) {
    console.error('Error:', e.message);
    console.error(e.stack);
  } finally {
    await prisma.$disconnect();
  }
})();
