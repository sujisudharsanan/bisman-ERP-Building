const { PrismaClient } = require('@prisma/client');

const RAILWAY_URL = 'postgresql://postgres:JNdJhwkgAhtLbiGOFDEZZRGOtCvQumvd@hopper.proxy.rlwy.net:30204/railway';

async function verify() {
  console.log('=== RAILWAY DATABASE VERIFICATION ===\n');
  
  const prisma = new PrismaClient({
    datasources: { db: { url: RAILWAY_URL } }
  });
  
  try {
    await prisma.$connect();
    console.log('✅ Connected to Railway database\n');
    
    const userCount = await prisma.user.count();
    console.log('Users:', userCount);
    
    const orgCount = await prisma.organization.count().catch(() => 0);
    console.log('Organizations:', orgCount);
    
    const roleCount = await prisma.role.count().catch(() => 0);
    console.log('Roles:', roleCount);
    
    console.log('\n✅ Migration successful!');
  } catch (e) {
    console.log('❌ Error:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}

verify();
