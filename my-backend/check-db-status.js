const { PrismaClient } = require('@prisma/client');
require('dotenv').config({ path: '.env.local' });

async function checkDBs() {
  console.log('=== LOCAL DATABASE CHECK ===');
  try {
    const localPrisma = new PrismaClient();
    await localPrisma.$connect();
    const localCount = await localPrisma.user.count();
    console.log('✅ Local DB connected - Users:', localCount);
    
    // Get some stats
    const orgCount = await localPrisma.organization.count().catch(() => 'N/A');
    const roleCount = await localPrisma.role.count().catch(() => 'N/A');
    console.log('   Organizations:', orgCount);
    console.log('   Roles:', roleCount);
    
    await localPrisma.$disconnect();
  } catch (e) {
    console.log('❌ Local DB error:', e.message);
  }

  console.log('\n=== RAILWAY DATABASE CHECK ===');
  const railwayUrl = process.env.RAILWAY_DATABASE_URL || process.env.DATABASE_URL_RAILWAY;
  if (!railwayUrl) {
    console.log('⚠️  No RAILWAY_DATABASE_URL found in env');
    console.log('   Available env vars with DATABASE:', Object.keys(process.env).filter(k => k.includes('DATABASE')));
    return;
  }
  
  try {
    const railwayPrisma = new PrismaClient({
      datasources: { db: { url: railwayUrl } }
    });
    await railwayPrisma.$connect();
    const railwayCount = await railwayPrisma.user.count();
    console.log('✅ Railway DB connected - Users:', railwayCount);
    
    // Get some stats
    const orgCount = await railwayPrisma.organization.count().catch(() => 'N/A');
    const roleCount = await railwayPrisma.role.count().catch(() => 'N/A');
    console.log('   Organizations:', orgCount);
    console.log('   Roles:', roleCount);
    
    await railwayPrisma.$disconnect();
  } catch (e) {
    console.log('❌ Railway DB error:', e.message);
  }
}

checkDBs().catch(console.error);
