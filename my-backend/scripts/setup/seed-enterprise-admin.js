const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Creating Enterprise Admin user...\n');

  try {
    // Hash the password
    const hashedPassword = await bcrypt.hash('enterprise123', 10);

    // Create or update Enterprise Admin in the enterpriseAdmin table
    const enterpriseAdmin = await prisma.enterprise_admins.upsert({
      where: { email: 'enterprise@bisman.erp' },
      update: {
        password: hashedPassword,
        name: 'Enterprise Administrator',
        is_active: true
      },
      create: {
        email: 'enterprise@bisman.erp',
        password: hashedPassword,
        name: 'Enterprise Administrator',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      }
    });

    console.log('✅ Enterprise Admin created successfully!');
    console.log('📧 Email:', enterpriseAdmin.email);
    console.log('🔑 Password: enterprise123');
    console.log('👤 Name:', enterpriseAdmin.name);
    console.log('🆔 ID:', enterpriseAdmin.id);
    console.log('✅ Active:', enterpriseAdmin.is_active);
    
    // Verify the user was created in the correct table
    const verifyUser = await prisma.enterprise_admins.findUnique({
      where: { email: 'enterprise@bisman.erp' }
    });
    
    if (verifyUser) {
      console.log('\n✅ Verification successful - Enterprise Admin exists in enterpriseAdmin table');
    }

  } catch (error) {
    console.error('❌ Error creating Enterprise Admin:', error.message);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
