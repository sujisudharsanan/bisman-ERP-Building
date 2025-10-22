#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');

// Local database
const localPrisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://postgres@localhost:5432/BISMAN'
    }
  }
});

// Railway database
const railwayPrisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://postgres:sstdOVvKqTCiPiKRKtRSpnrtkgEUdKnj@gondola.proxy.rlwy.net:53308/railway'
    }
  }
});

async function migrateData() {
  try {
    console.log('🚀 Starting data migration to Railway...\n');

    // 1. Migrate RBAC Roles
    console.log('📋 Migrating RBAC Roles...');
    const roles = await localPrisma.rbac_roles.findMany();
    console.log(`Found ${roles.length} roles in local database`);
    
    for (const role of roles) {
      await railwayPrisma.rbac_roles.upsert({
        where: { id: role.id },
        update: role,
        create: role
      });
    }
    console.log('✅ RBAC Roles migrated\n');

    // 2. Migrate Users
    console.log('👥 Migrating Users...');
    const users = await localPrisma.User.findMany();
    console.log(`Found ${users.length} users in local database`);
    
    for (const user of users) {
      await railwayPrisma.User.upsert({
        where: { id: user.id },
        update: user,
        create: user
      });
    }
    console.log('✅ Users migrated\n');

    // 3. Migrate RBAC Routes
    console.log('🛣️  Migrating RBAC Routes...');
    const routes = await localPrisma.rbac_routes.findMany();
    console.log(`Found ${routes.length} routes in local database`);
    
    for (const route of routes) {
      await railwayPrisma.rbac_routes.upsert({
        where: { id: route.id },
        update: route,
        create: route
      });
    }
    console.log('✅ RBAC Routes migrated\n');

    // 4. Migrate RBAC Actions
    console.log('⚡ Migrating RBAC Actions...');
    const actions = await localPrisma.rbac_actions.findMany();
    console.log(`Found ${actions.length} actions in local database`);
    
    for (const action of actions) {
      await railwayPrisma.rbac_actions.upsert({
        where: { id: action.id },
        update: action,
        create: action
      });
    }
    console.log('✅ RBAC Actions migrated\n');

    // 5. Migrate RBAC Permissions
    console.log('🔐 Migrating RBAC Permissions...');
    const permissions = await localPrisma.rbac_permissions.findMany();
    console.log(`Found ${permissions.length} permissions in local database`);
    
    for (const permission of permissions) {
      await railwayPrisma.rbac_permissions.upsert({
        where: { id: permission.id },
        update: permission,
        create: permission
      });
    }
    console.log('✅ RBAC Permissions migrated\n');

    // 6. Migrate User Permissions
    console.log('🎯 Migrating User Permissions...');
    const userPermissions = await localPrisma.rbac_user_permissions.findMany();
    console.log(`Found ${userPermissions.length} user permissions in local database`);
    
    for (const userPerm of userPermissions) {
      await railwayPrisma.rbac_user_permissions.upsert({
        where: { id: userPerm.id },
        update: userPerm,
        create: userPerm
      });
    }
    console.log('✅ User Permissions migrated\n');

    console.log('🎉 Data migration completed successfully!');
    console.log('\nSummary:');
    console.log(`  - ${roles.length} roles`);
    console.log(`  - ${users.length} users`);
    console.log(`  - ${routes.length} routes`);
    console.log(`  - ${actions.length} actions`);
    console.log(`  - ${permissions.length} permissions`);
    console.log(`  - ${userPermissions.length} user permissions`);

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await localPrisma.$disconnect();
    await railwayPrisma.$disconnect();
  }
}

migrateData()
  .then(() => {
    console.log('\n✨ All done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
  });
