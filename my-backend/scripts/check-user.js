const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUser() {
  const email = 'sujisudharsanan@gmail.com';
  
  console.log('Checking user:', email);
  console.log('---');
  
  // Check enterprise_admins
  const ea = await prisma.enterprise_admins.findUnique({ where: { email } });
  console.log('Enterprise Admin:', ea ? { id: ea.id, email: ea.email, is_active: ea.is_active, hasPasswordHash: !!ea.password_hash } : 'Not found');
  
  // Check super_admins
  const sa = await prisma.super_admins.findUnique({ where: { email } });
  console.log('Super Admin:', sa ? { id: sa.id, email: sa.email, is_active: sa.is_active, hasPasswordHash: !!sa.password_hash } : 'Not found');
  
  // Check users_enhanced
  try {
    const user = await prisma.users_enhanced.findUnique({ where: { email } });
    console.log('User (users_enhanced):', user ? { id: user.id, email: user.email, role: user.role, hasPasswordHash: !!user.password_hash } : 'Not found');
  } catch (e) {
    console.log('users_enhanced table not available:', e.message);
  }
  
  // Check legacy users
  const legacy = await prisma.$queryRaw`SELECT id, email, role, is_active, password_hash IS NOT NULL as has_hash FROM users WHERE email = ${email}`;
  console.log('Legacy User:', legacy.length > 0 ? legacy[0] : 'Not found');
  
  await prisma.$disconnect();
}

checkUser().catch(e => { console.error(e); process.exit(1); });
