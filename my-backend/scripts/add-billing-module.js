/**
 * Add billing module to database if it doesn't exist
 */
const { getPrisma } = require('../lib/prisma');
const prisma = getPrisma();

async function addBillingModule() {
  try {
    // Check if billing module exists
    const existing = await prisma.modules.findFirst({
      where: { module_name: 'billing' }
    });
    
    if (existing) {
      console.log('✅ Billing module already exists:', existing.id, existing.display_name);
      return;
    }
    
    // Add billing module
    const result = await prisma.modules.create({
      data: {
        module_name: 'billing',
        display_name: 'Billing & Subscription',
        productType: 'ALL',
        is_always_accessible: true,
        route: '/billing'
      }
    });
    console.log('✅ Created billing module with ID:', result.id);
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

addBillingModule();
