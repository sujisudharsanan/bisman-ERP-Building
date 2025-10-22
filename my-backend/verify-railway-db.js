#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');

const railwayPrisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://postgres:sstdOVvKqTCiPiKRKtRSpnrtkgEUdKnj@gondola.proxy.rlwy.net:53308/railway'
    }
  }
});

async function verifyData() {
  try {
    console.log('🔍 Verifying Railway database...\n');

    const userCount = await railwayPrisma.User.count();
    const roleCount = await railwayPrisma.rbac_roles.count();
    const routeCount = await railwayPrisma.rbac_routes.count();
    const actionCount = await railwayPrisma.rbac_actions.count();
    const permissionCount = await railwayPrisma.rbac_permissions.count();
    const userPermissionCount = await railwayPrisma.rbac_user_permissions.count();

    console.log('📊 Railway Database Status:');
    console.log('═══════════════════════════════════════');
    console.log(`  👥 Users:             ${userCount}`);
    console.log(`  🎭 Roles:             ${roleCount}`);
    console.log(`  🛣️  Routes:            ${routeCount}`);
    console.log(`  ⚡ Actions:           ${actionCount}`);
    console.log(`  🔐 Permissions:       ${permissionCount}`);
    console.log(`  🎯 User Permissions:  ${userPermissionCount}`);
    console.log('═══════════════════════════════════════\n');

    // Get sample users
    const users = await railwayPrisma.User.findMany({
      select: { id: true, username: true, email: true, role: true }
    });

    console.log('👤 Sample Users:');
    users.forEach(user => {
      console.log(`  ${user.id}. ${user.username} (${user.role}) - ${user.email}`);
    });

    console.log('\n✅ Verification complete!');

  } catch (error) {
    console.error('❌ Verification failed:', error);
    throw error;
  } finally {
    await railwayPrisma.$disconnect();
  }
}

verifyData()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
