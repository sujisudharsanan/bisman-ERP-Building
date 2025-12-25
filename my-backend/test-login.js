const { getPrisma } = require('./lib/prisma');
const bcrypt = require('bcryptjs');
const prisma = getPrisma();

async function test() {
  try {
    const users = await prisma.$queryRaw`SELECT id, email, password_hash, role FROM users WHERE email = 'arun.kumar@bisman.demo' LIMIT 1`;
    const user = users[0];
    console.log('User:', user ? { email: user.email, hasHash: !!user.password_hash, hashLen: user.password_hash?.length } : 'none');
    
    if (user && user.password_hash) {
      const result = bcrypt.compareSync('Demo@123', user.password_hash);
      console.log('Password Demo@123 valid:', result);
      
      const result2 = bcrypt.compareSync('password', user.password_hash);
      console.log('Password "password" valid:', result2);
    }
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}
test();
