/**
 * Sync Common Module Pages to Database
 * 
 * This script optionally adds common module pages to user permissions in the database.
 * 
 * NOTE: This is OPTIONAL because common pages are automatically accessible to all
 * authenticated users via the 'authenticated' permission. Run this script only if you
 * want to track common page access in the permission manager.
 * 
 * Usage:
 *   node scripts/sync-common-pages.js [--dry-run] [--user-id=123]
 * 
 * Options:
 *   --dry-run     Show what would be done without making changes
 *   --user-id=X   Only sync for specific user ID
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Common module pages (should match common-module-registry.ts)
const COMMON_PAGES = [
  'common-about-me',
  'common-change-password',
  'common-security-settings',
  'common-notifications',
  'common-messages',
  'common-help-center',
  'common-documentation',
  'common-user-settings',
];

async function syncCommonPages() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run');
  const userIdArg = args.find(arg => arg.startsWith('--user-id='));
  const specificUserId = userIdArg ? parseInt(userIdArg.split('=')[1]) : null;

  console.log('🔄 Common Module Pages Sync');
  console.log('═'.repeat(60));
  console.log(`Mode: ${isDryRun ? '🔍 DRY RUN (no changes)' : '✍️  WRITE (making changes)'}`);
  console.log(`Target: ${specificUserId ? `User ID ${specificUserId}` : 'All active users'}`);
  console.log('═'.repeat(60));
  console.log();

  try {
    // Get all active users (or specific user)
    const whereClause = specificUserId 
      ? { id: specificUserId, status: 'active' }
      : { status: 'active' };

    const users = await prisma.users.findMany({
      where: whereClause,
      select: {
        id: true,
        username: true,
        email: true,
        role_id: true,
        rbac_roles: {
          select: {
            role_name: true,
          },
        },
      },
    });

    console.log(`📊 Found ${users.length} active user(s)\n`);

    if (users.length === 0) {
      console.log('⚠️  No users found with criteria');
      return;
    }

    // Get all common permissions
    const commonPermissions = await prisma.rbac_permissions.findMany({
      where: {
        page_key: {
          in: COMMON_PAGES,
        },
      },
      select: {
        id: true,
        page_key: true,
        page_name: true,
      },
    });

    console.log(`🔑 Found ${commonPermissions.length} common page permission(s) in database\n`);

    if (commonPermissions.length === 0) {
      console.log('⚠️  No common page permissions found in rbac_permissions table');
      console.log('💡 You may need to run the permission seed script first');
      return;
    }

    const permissionMap = new Map(
      commonPermissions.map(p => [p.page_key, p])
    );

    let totalAdded = 0;
    let totalSkipped = 0;

    // Process each user
    for (const user of users) {
      const roleName = user.rbac_roles?.role_name || 'Unknown';
      console.log(`👤 User: ${user.username} (${user.email}) - ${roleName}`);

      // Get existing permissions for this user
      const existingPermissions = await prisma.rbac_user_permissions.findMany({
        where: {
          user_id: user.id,
          permission_id: {
            in: commonPermissions.map(p => p.id),
          },
        },
        select: {
          permission_id: true,
          rbac_permissions: {
            select: {
              page_key: true,
            },
          },
        },
      });

      const existingPageKeys = new Set(
        existingPermissions.map(ep => ep.rbac_permissions.page_key)
      );

      // Find missing common pages
      const missingPages = COMMON_PAGES.filter(pageKey => !existingPageKeys.has(pageKey));

      if (missingPages.length === 0) {
        console.log('  ✅ Already has all common pages');
        totalSkipped++;
      } else {
        console.log(`  ➕ Adding ${missingPages.length} common page(s):`);
        
        for (const pageKey of missingPages) {
          const permission = permissionMap.get(pageKey);
          if (permission) {
            console.log(`     • ${permission.page_name} (${pageKey})`);
            
            if (!isDryRun) {
              await prisma.rbac_user_permissions.create({
                data: {
                  user_id: user.id,
                  permission_id: permission.id,
                  granted_at: new Date(),
                },
              });
            }
            totalAdded++;
          }
        }
      }
      console.log();
    }

    // Summary
    console.log('═'.repeat(60));
    console.log('📈 SUMMARY');
    console.log('═'.repeat(60));
    console.log(`Users processed: ${users.length}`);
    console.log(`Permissions added: ${totalAdded}`);
    console.log(`Users already synced: ${totalSkipped}`);
    
    if (isDryRun) {
      console.log();
      console.log('🔍 DRY RUN COMPLETE - No changes were made');
      console.log('💡 Run without --dry-run to apply changes');
    } else {
      console.log();
      console.log('✅ SYNC COMPLETE');
    }

  } catch (error) {
    console.error('❌ Error syncing common pages:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
syncCommonPages()
  .then(() => {
    console.log();
    console.log('🎉 Script finished successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error();
    console.error('💥 Script failed:', error.message);
    process.exit(1);
  });
