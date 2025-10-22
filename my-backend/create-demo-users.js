/**
 * Script to create demo users for all active roles in the system
 * This will create one demo user per role for testing purposes
 */

const { getPrisma } = require('./lib/prisma');
const bcrypt = require('bcryptjs');

async function createDemoUsers() {
  const prisma = getPrisma();
  
  try {
    console.log('\n========================================');
    console.log('CREATE DEMO USERS FOR ALL ROLES');
    console.log('========================================\n');
    
    // Fetch all active roles
    const roles = await prisma.rbac_roles.findMany({
      where: { status: 'active' },
      orderBy: { id: 'asc' }
    });
    
    console.log(`Found ${roles.length} active roles\n`);
    
    // Check which roles already have demo users
    const existingUsers = await prisma.User.findMany({
      where: {
        username: {
          startsWith: 'demo_'
        }
      }
    });
    
    console.log(`Existing demo users: ${existingUsers.length}\n`);
    
    // Default password for all demo users
    const defaultPassword = 'Demo@123';
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);
    
    const usersToCreate = [];
    const skippedRoles = [];
    
    for (const role of roles) {
      // Create username from role name
      const username = `demo_${role.name.toLowerCase().replace(/[-_\s]+/g, '_')}`;
      const email = `${username}@bisman.demo`;
      
      // Check if user with this username already exists
      const existingUser = await prisma.User.findFirst({
        where: {
          OR: [
            { username: username },
            { email: email }
          ]
        }
      });
      
      if (existingUser) {
        skippedRoles.push({
          role: role.name,
          reason: 'User already exists',
          existing: existingUser.username
        });
        continue;
      }
      
      usersToCreate.push({
        username: username,
        email: email,
        password: hashedPassword,
        role: role.name,
        roleInfo: role.display_name || role.name
      });
    }
    
    console.log('Users to be created:');
    console.log('--------------------');
    usersToCreate.forEach((u, idx) => {
      console.log(`${idx + 1}. Username: ${u.username}`);
      console.log(`   Email: ${u.email}`);
      console.log(`   Role: ${u.role} (${u.roleInfo})`);
      console.log('');
    });
    
    if (skippedRoles.length > 0) {
      console.log('\nSkipped roles (demo user exists):');
      console.log('----------------------------------');
      skippedRoles.forEach(s => {
        console.log(`  - ${s.role}: ${s.existing}`);
      });
      console.log('');
    }
    
    if (usersToCreate.length === 0) {
      console.log('✅ All roles already have demo users!\n');
      console.log('========================================\n');
      await prisma.$disconnect();
      return;
    }
    
    console.log(`\n📝 Summary:`);
    console.log(`   - Total roles: ${roles.length}`);
    console.log(`   - New users to create: ${usersToCreate.length}`);
    console.log(`   - Existing demo users: ${skippedRoles.length}`);
    console.log(`   - Default password: ${defaultPassword}`);
    
    // Check if --confirm flag is present
    if (!process.argv.includes('--confirm')) {
      console.log('\n⚠️  To create these users, run with --confirm flag:');
      console.log('   node create-demo-users.js --confirm\n');
      console.log('❌ Aborted. No users created.');
      console.log('\n========================================\n');
      await prisma.$disconnect();
      return;
    }
    
    console.log('\n\nCreating users...\n');
    
    // Create users
    const createdUsers = [];
    for (const userData of usersToCreate) {
      try {
        const user = await prisma.User.create({
          data: {
            username: userData.username,
            email: userData.email,
            password: userData.password,
            role: userData.role
          }
        });
        
        createdUsers.push(user);
        console.log(`✅ Created: ${user.username} (ID: ${user.id})`);
      } catch (error) {
        console.error(`❌ Failed to create ${userData.username}:`, error.message);
      }
    }
    
    console.log(`\n✅ Successfully created ${createdUsers.length} demo users!`);
    
    // Show all demo users
    console.log('\n=== ALL DEMO USERS ===');
    console.log('----------------------\n');
    
    const allDemoUsers = await prisma.User.findMany({
      where: {
        username: {
          startsWith: 'demo_'
        }
      },
      orderBy: { role: 'asc' },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        createdAt: true
      }
    });
    
    allDemoUsers.forEach(u => {
      console.log(`ID: ${u.id} | ${u.username}`);
      console.log(`  Email: ${u.email}`);
      console.log(`  Role: ${u.role}`);
      console.log(`  Created: ${u.createdAt.toLocaleDateString()}`);
      console.log('');
    });
    
    console.log(`Total demo users: ${allDemoUsers.length}`);
    console.log(`\n🔑 Default password for all demo users: ${defaultPassword}`);
    console.log('\n========================================\n');
    
  } catch (error) {
    console.error('❌ Error creating demo users:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
createDemoUsers();
