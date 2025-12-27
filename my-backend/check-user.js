const { getPrisma } = require('./lib/prisma');
const prisma = getPrisma();
const bcrypt = require('bcryptjs');

(async () => {
  try {
    const user = await prisma.user.findUnique({ where: { email: 'suji@gmail.com' } });
    console.log('User found (lowercase):', user ? 'YES' : 'NO');
    
    if (!user) {
      const userUpper = await prisma.user.findFirst({ 
        where: { email: { contains: 'suji', mode: 'insensitive' } } 
      });
      console.log('User found (case insensitive):', userUpper ? 'YES' : 'NO');
      if (userUpper) console.log('Actual email in DB:', userUpper.email);
    }
    
    if (user) {
      console.log('User ID:', user.id);
      console.log('Email:', user.email);
      console.log('Role:', user.role);
      console.log('is_active:', user.is_active);
      console.log('Has password_hash:', !!user.password_hash);
      console.log('tenant_id:', user.tenant_id);
      
      const isValid = bcrypt.compareSync('Suji@1234567890', user.password_hash);
      console.log('Password valid:', isValid);
    }
    
    const allUsers = await prisma.user.findMany({ take: 10 });
    console.log('\nAll users in DB:', allUsers.length);
    allUsers.forEach(u => console.log(' -', u.email, '| role:', u.role));
    
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await prisma.$disconnect();
  }
})();
