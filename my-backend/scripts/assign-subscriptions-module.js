/**
 * Script to assign the subscriptions module to Super Admin
 * Run with: node scripts/assign-subscriptions-module.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function assignSubscriptionsModule() {
  try {
    // Find all Super Admins
    const superAdmins = await prisma.super_admins.findMany();
    console.log('Found', superAdmins.length, 'Super Admins');
    
    // Find the subscriptions module
    const subscriptionsModule = await prisma.modules.findFirst({ 
      where: { module_name: 'subscriptions' } 
    });
    
    if (!subscriptionsModule) {
      console.log('Subscriptions module not found in database');
      return;
    }
    
    console.log('Subscriptions Module ID:', subscriptionsModule.id);
    
    for (const superAdmin of superAdmins) {
      console.log('\nProcessing Super Admin:', superAdmin.email);
      
      // Check if already assigned
      const existing = await prisma.module_assignments.findFirst({
        where: { 
          super_admin_id: superAdmin.id, 
          module_id: subscriptionsModule.id 
        }
      });
      
      if (existing) {
        console.log('  - Subscriptions module already assigned');
      } else {
        // Assign the module
        await prisma.module_assignments.create({
          data: {
            super_admin_id: superAdmin.id,
            module_id: subscriptionsModule.id
          }
        });
        console.log('  - Subscriptions module ASSIGNED!');
      }
    }
    
    console.log('\nDone!');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

assignSubscriptionsModule();
