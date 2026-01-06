const { getPrisma } = require('./lib/prisma');
const bcrypt = require('bcryptjs');

async function checkEnterpriseAdmin() {
  const prisma = getPrisma();
  
  try {
    console.log('🔍 Checking enterprise admin...\n');
    
    const admin = await prisma.enterprise_admins.findUnique({
      where: { email: 'enterprise@bisman.erp' }
    });
    
    if (admin) {
      console.log('✅ Enterprise Admin found:');
      console.log('   ID:', admin.id);
      console.log('   Email:', admin.email);
      console.log('   Name:', admin.name);
      console.log('   Active:', admin.is_active);
      console.log('   Password Hash:', admin.password.substring(0, 20) + '...');
      
      // Test password
      const testPassword = process.env.ENTERPRISE_PASSWORD || 'Enterprise@123';
      if (!process.env.ENTERPRISE_PASSWORD) {
        console.warn('⚠️  Warning: ENTERPRISE_PASSWORD env var not set, using fallback');
      }
      const isValid = bcrypt.compareSync(testPassword, admin.password);
      console.log(`\n🔐 Password check:`, isValid ? '✅ VALID' : '❌ INVALID');
      
      if (!isValid) {
        console.log('\n💡 Creating/updating with correct password...');
        const hashedPassword = bcrypt.hashSync(testPassword, 10);
        
        await prisma.enterprise_admins.update({
          where: { id: admin.id },
          data: { password: hashedPassword }
        });
        
        console.log('✅ Password updated successfully!');
      }
    } else {
      console.log('❌ Enterprise Admin NOT found');
      console.log('\n💡 Creating enterprise admin...');
      
      const enterprisePassword = process.env.ENTERPRISE_PASSWORD || 'Enterprise@123';
      if (!process.env.ENTERPRISE_PASSWORD) {
        console.warn('⚠️  Warning: ENTERPRISE_PASSWORD env var not set, using fallback');
      }
      const hashedPassword = bcrypt.hashSync(enterprisePassword, 10);
      
      const newAdmin = await prisma.enterprise_admins.create({
        data: {
          email: 'enterprise@bisman.erp',
          password: hashedPassword,
          name: 'Enterprise Administrator',
          is_active: true,
          role: 'ENTERPRISE_ADMIN'
        }
      });
      
      console.log('✅ Enterprise Admin created:');
      console.log('   ID:', newAdmin.id);
      console.log('   Email:', newAdmin.email);
      console.log('   Password: [ENTERPRISE_PASSWORD env var]');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Details:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkEnterpriseAdmin();
