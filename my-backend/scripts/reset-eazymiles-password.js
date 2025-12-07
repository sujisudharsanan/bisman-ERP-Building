const bcrypt = require('bcryptjs');
const { getPrisma } = require('../lib/prisma');

async function resetPassword() {
  const prisma = getPrisma();
  
  // Hash the new password
  const newPassword = 'Demo@123';
  const hash = await bcrypt.hash(newPassword, 10);
  
  console.log('Looking for user: admin@eazymiles.com');
  console.log('New password hash:', hash);
  
  try {
    // Disable triggers temporarily
    await prisma.$executeRawUnsafe('SET session_replication_role = replica');
    
    // Use raw SQL to update
    const result = await prisma.$executeRawUnsafe(`
      UPDATE users 
      SET password_hash = '${hash}', is_active = true 
      WHERE email = 'admin@eazymiles.com'
    `);
    
    // Re-enable triggers
    await prisma.$executeRawUnsafe('SET session_replication_role = DEFAULT');
    
    console.log('Rows updated:', result);
    
    if (result === 0) {
      console.log('User not found. Checking if user exists...');
      
      const users = await prisma.$queryRawUnsafe(`
        SELECT id, email, username, role, is_active 
        FROM users 
        WHERE email LIKE '%eazymiles%' OR email LIKE '%admin%'
        LIMIT 10
      `);
      
      console.log('Found users:', JSON.stringify(users, null, 2));
    } else {
      console.log('✅ Password reset successful for admin@eazymiles.com');
      console.log('   New password: Demo@123');
    }
  } catch (error) {
    console.error('Update error:', error.message);
    // Try re-enabling triggers if there was an error
    await prisma.$executeRawUnsafe('SET session_replication_role = DEFAULT').catch(() => {});
    throw error;
  }
  
  await prisma.$disconnect();
}

resetPassword().catch(e => {
  console.error('Error:', e.message);
  process.exit(1);
});
