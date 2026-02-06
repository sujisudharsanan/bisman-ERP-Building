// Seed Hub Incharge permissions
const { getPrisma } = require('./my-backend/lib/prisma');
const prisma = getPrisma();

async function seedHubInchargePermissions() {
  try {
    // Find Hub Incharge user
    const user = await prisma.users_enhanced.findFirst({
      where: {
        OR: [
          { username: 'demo_hub_incharge' },
          { email: 'demo_hub_incharge@bisman.demo' }
        ]
      }
    });

    if (!user) {
      console.log('❌ Hub Incharge user not found');
      return;
    }

    console.log(`✅ Found user: ${user.username} (ID: ${user.id})`);

    // Hub Incharge default pages
    const hubInchargePages = [
      'dashboard',
      'hub-incharge-dashboard',
      'delivery-note',
      'material-receipt',
      'goods-receipt-note',
      'goods-issue-note',
    ];

    // Delete existing permissions
    await prisma.rbac_user_permissions.deleteMany({
      where: { user_id: user.id }
    });

    console.log('🗑️  Cleared existing permissions');

    // Insert new permissions
    const permissions = hubInchargePages.map(pageKey => ({
      user_id: user.id,
      page_key: pageKey,
      created_at: new Date(),
    }));

    await prisma.rbac_user_permissions.createMany({
      data: permissions
    });

    console.log(`✅ Created ${permissions.length} permissions for Hub Incharge:`);
    hubInchargePages.forEach(page => console.log(`   - ${page}`));

    // Verify
    const count = await prisma.rbac_user_permissions.count({
      where: { user_id: user.id }
    });

    console.log(`\n✅ Total permissions for ${user.username}: ${count}`);

  } catch (error) {
    console.error('❌ Error seeding permissions:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedHubInchargePermissions();
