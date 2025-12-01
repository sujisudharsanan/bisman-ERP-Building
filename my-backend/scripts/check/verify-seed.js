#!/usr/bin/env node
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verify() {
  console.log('\n🔍 Verifying Demo Users Creation\n');
  console.log('='.repeat(80));
  
  try {
    // Check all users
    const allUsers = await prisma.user.findMany({
      where: {
        email: { contains: '@bisman.demo' }
      },
      select: {
        id: true,
        email: true,
        role: true,
        username: true
      },
      orderBy: { id: 'asc' }
    });
    
    console.log(`\n✅ Found ${allUsers.length} demo users:\n`);
    allUsers.forEach((user, idx) => {
      console.log(`${idx + 1}. ${user.email.padEnd(35)} | Role: ${user.role.padEnd(25)}`);
    });
    
    // Check if profiles exist
    if (allUsers.length > 0) {
      const profileCount = await prisma.userProfile.count({
        where: { userId: { in: allUsers.map(u => u.id) } }
      });
      console.log(`\n📋 User Profiles: ${profileCount}/${allUsers.length}`);
      
      const addressCount = await prisma.userAddress.count({
        where: { userId: { in: allUsers.map(u => u.id) } }
      });
      console.log(`📍 Addresses: ${addressCount} (should be ${allUsers.length * 2})`);
      
      const kycCount = await prisma.userKYC.count({
        where: { userId: { in: allUsers.map(u => u.id) } }
      });
      console.log(`🆔 KYC Records: ${kycCount}/${allUsers.length}`);
      
      const bankCount = await prisma.userBankAccount.count({
        where: { userId: { in: allUsers.map(u => u.id) } }
      });
      console.log(`🏦 Bank Accounts: ${bankCount}/${allUsers.length}`);
      
      const eduCount = await prisma.userEducation.count({
        where: { userId: { in: allUsers.map(u => u.id) } }
      });
      console.log(`🎓 Education Records: ${eduCount}`);
      
      const skillCount = await prisma.userSkill.count({
        where: { userId: { in: allUsers.map(u => u.id) } }
      });
      console.log(`💪 Skills: ${skillCount}`);
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('\n🔐 All demo users password: Demo@123\n');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

verify();
