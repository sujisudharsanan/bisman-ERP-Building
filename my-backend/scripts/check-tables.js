const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const email = 'sujisudharsanan@gmail.com';
  
  // Check legacy users table 
  const legacyUser = await prisma.$queryRaw`SELECT id, email, password_hash, role, tenant_id FROM users WHERE email = ${email}`;
  console.log('legacy users table:', legacyUser[0] ? {
    id: legacyUser[0].id,
    email: legacyUser[0].email,
    has_hash: !!legacyUser[0].password_hash,
    role: legacyUser[0].role,
    tenant_id: legacyUser[0].tenant_id
  } : 'NOT FOUND');

  // Check users_enhanced table
  const enhancedUser = await prisma.$queryRaw`SELECT id, email, password_hash, role, tenant_id FROM users_enhanced WHERE email = ${email}`;
  console.log('users_enhanced table:', enhancedUser[0] ? {
    id: enhancedUser[0].id,
    email: enhancedUser[0].email,
    has_hash: !!enhancedUser[0].password_hash,
    role: enhancedUser[0].role,
    tenant_id: enhancedUser[0].tenant_id
  } : 'NOT FOUND');
  
  await prisma.$disconnect();
}
main();
