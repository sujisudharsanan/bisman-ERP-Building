const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Creating Enterprise Admin user...\n');

  try {
    // Hash the password
    const hashedPassword = await bcrypt.hash('enterprise123', 10);

    // Create or update Enterprise Admin
    const enterpriseAdmin = await prisma.user.upsert({
      where: { email: 'enterprise@bisman.erp' },
      update: {
        password: hashedPassword,
        role: 'ENTERPRISE_ADMIN',
        username: 'enterprise_admin'
      },
      create: {
        email: 'enterprise@bisman.erp',
        password: hashedPassword,
        role: 'ENTERPRISE_ADMIN',
        username: 'enterprise_admin',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });

    console.log('✅ Enterprise Admin created successfully!');
    console.log('📧 Email:', enterpriseAdmin.email);
    console.log('🔑 Password: enterprise123');
    console.log('👤 Role:', enterpriseAdmin.role);
    console.log('🆔 ID:', enterpriseAdmin.id);
    
    // Verify the user was created
    const verifyUser = await prisma.user.findUnique({
      where: { email: 'enterprise@bisman.erp' }
    });
    
    if (verifyUser) {
      console.log('\n✅ Verification successful - User exists in database');
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
