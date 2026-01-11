const { getPrisma } = require('../lib/prisma');
const prisma = getPrisma();

async function check() {
  const clientId = '72feb17f-c011-42c9-a797-b82b1cb514e4'; // Sellertrail
  
  console.log('Checking admin users for tenant:', clientId);
  
  const adminUsers = await prisma.user.findMany({
    where: { 
      tenant_id: clientId,
      is_active: true,
      role: 'ADMIN',
    },
    select: {
      id: true,
      email: true,
      username: true,
      password_hash: true,
    },
  });
  
  console.log('Admin users found:', adminUsers.length);
  adminUsers.forEach(u => {
    console.log('User:', u.email, 'hasPassword:', !!(u.password_hash && u.password_hash.length > 0), 'hash length:', u.password_hash?.length || 0);
  });
  
  // Also check directly
  console.log('\nDirect check for suji@gmail.com:');
  const suji = await prisma.users_enhanced.findFirst({
    where: { email: 'suji@gmail.com' },
    select: { id: true, email: true, password_hash: true, tenant_id: true, role: true },
  });
  console.log('Suji user:', suji);
  console.log('Has password_hash?', !!(suji?.password_hash));
  
  await prisma.$disconnect();
}

check().catch(console.error);
