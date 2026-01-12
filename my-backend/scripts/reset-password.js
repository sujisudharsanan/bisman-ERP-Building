const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function resetPassword() {
  const email = 'sujisudharsanan@gmail.com';
  const newPassword = 'Sudharsanan@12345';
  
  // Generate bcrypt hash
  const saltRounds = 10;
  const passwordHash = await bcrypt.hash(newPassword, saltRounds);
  
  console.log('Resetting password for:', email);
  console.log('New password will be:', newPassword);
  console.log('---');
  
  // Update in legacy users table
  const result = await prisma.$executeRaw`
    UPDATE users 
    SET password_hash = ${passwordHash}
    WHERE email = ${email}
  `;
  
  console.log('Legacy users table updated rows:', result);
  
  // Also update in users_enhanced table
  const result2 = await prisma.$executeRaw`
    UPDATE users_enhanced 
    SET password_hash = ${passwordHash}
    WHERE email = ${email}
  `;
  
  console.log('users_enhanced table updated rows:', result2);
  
  if (result > 0 || result2 > 0) {
    console.log('✅ Password reset successful!');
    console.log('You can now login with:', email, '/', newPassword);
  } else {
    console.log('❌ No user found with that email');
  }
  
  await prisma.$disconnect();
}

resetPassword().catch(e => { console.error(e); process.exit(1); });
