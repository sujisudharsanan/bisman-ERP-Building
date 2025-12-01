/**
 * Migration script to update old page IDs to new consistent IDs
 * in super_admin_module_assignments.page_permissions
 * 
 * Run with: node scripts/migrate-page-ids.js
 * 
 * Note: Make sure DATABASE_URL is set in your environment
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') });

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Mapping of old IDs to new IDs
const PAGE_ID_MAP = {
  // Old short IDs → New prefixed IDs (matching page-registry.ts)
  'security': 'super-admin-security',
  'it-admin': 'super-admin-it-admin',
  'user-management': 'super-admin-user-management',
  'user-creation': 'super-admin-user-creation',
  'roles-users': 'super-admin-roles-users-report',
  'pages-roles': 'super-admin-pages-roles-report',
  'role-access-explorer': 'super-admin-role-access-explorer',
  'permission-manager': 'super-admin-permission-manager',
  'system-settings': 'super-admin-system-settings',
  'integration-settings': 'super-admin-integration-settings',
  'deployment': 'super-admin-deployment-tools',
  'backup-restore': 'super-admin-backup-restore',
  'system-health': 'super-admin-system-health',
  'about-me': 'super-admin-about-me',
};

async function migratePageIds() {
  console.log('🔄 Starting page ID migration...\n');

  try {
    // Get all module assignments with page_permissions
    const assignments = await prisma.moduleAssignment.findMany({
      include: {
        module: true,
        superAdmin: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    console.log(`📦 Found ${assignments.length} module assignments\n`);

    let updatedCount = 0;
    let skippedCount = 0;

    for (const assignment of assignments) {
      const oldPageIds = assignment.page_permissions || [];
      
      // Map old IDs to new IDs
      const newPageIds = oldPageIds.map(id => PAGE_ID_MAP[id] || id);
      
      // Check if any IDs changed
      const hasChanges = JSON.stringify(oldPageIds.sort()) !== JSON.stringify(newPageIds.sort());
      
      if (hasChanges) {
        console.log(`\n📝 Updating assignment ${assignment.id}:`);
        console.log(`   Super Admin: ${assignment.superAdmin?.name || 'N/A'}`);
        console.log(`   Module: ${assignment.module?.display_name || assignment.module_id}`);
        console.log(`   Old IDs: ${oldPageIds.join(', ') || '(none)'}`);
        console.log(`   New IDs: ${newPageIds.join(', ') || '(none)'}`);
        
        await prisma.moduleAssignment.update({
          where: { id: assignment.id },
          data: { page_permissions: newPageIds }
        });
        
        console.log(`   ✅ Updated!`);
        updatedCount++;
      } else {
        skippedCount++;
      }
    }

    console.log(`\n\n📊 Migration Summary:`);
    console.log(`   ✅ Updated: ${updatedCount}`);
    console.log(`   ⏭️  Skipped (no changes): ${skippedCount}`);
    console.log(`   📦 Total: ${assignments.length}`);
    console.log(`\n🎉 Migration complete!`);

  } catch (error) {
    console.error('❌ Migration error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

migratePageIds();
