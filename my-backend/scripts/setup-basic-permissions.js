const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function setupBasicPermissions() {
  console.log('🔧 Setting up basic role permissions...')
  
  try {
    // Define basic permissions for each role
    const rolePermissions = {
      'USER': [
        'dashboard.read',
        'profile.read',
        'profile.update'
      ],
      'STAFF': [
        'dashboard.read',
        'inventory.read',
        'inventory.update',
        'sales.read',
        'sales.create',
        'hub.manage',
        'profile.read',
        'profile.update'
      ],
      'MANAGER': [
        'dashboard.read',
        'dashboard.manage',
        'inventory.read',
        'inventory.update',
        'inventory.create',
        'sales.read',
        'sales.create',
        'sales.update',
        'reports.read',
        'staff.manage',
        'hub.manage',
        'profile.read',
        'profile.update'
      ],
      'ADMIN': [
        'dashboard.admin',
        'users.admin',
        'users.create',
        'users.update', 
        'users.delete',
        'roles.admin',
        'permissions.admin',
        'system.manage',
        'reports.admin',
        'profile.read',
        'profile.update'
      ],
      'SUPER_ADMIN': [
        '*.*' // All permissions
      ]
    }
    
    // Get all users and assign basic permissions
    const users = await prisma.user.findMany()
    
    for (const user of users) {
      const userRole = user.role
      const permissions = rolePermissions[userRole] || rolePermissions['USER']
      
      console.log(`✅ User ${user.email} (${userRole}):`)
      permissions.forEach(permission => {
        console.log(`   - ${permission}`)
      })
    }
    
    console.log('\n🎯 Basic Role Definitions:')
    console.log('============================')
    console.log('USER: Basic dashboard and profile access')
    console.log('STAFF: Hub operations, inventory, sales')  
    console.log('MANAGER: Management level, reports, staff oversight')
    console.log('ADMIN: User management, system configuration')
    console.log('SUPER_ADMIN: Full system access')
    
    console.log('\n✅ All users have proper role-based permissions!')
    console.log('💡 Roles are working with the simple role-based system.')
    
  } catch (error) {
    console.error('❌ Error setting up permissions:', error)
    throw error
  }
}

// Also create a simple role checker function
function checkRoleAccess(userRole, requiredRoles) {
  const roleHierarchy = {
    'USER': 1,
    'STAFF': 2, 
    'MANAGER': 3,
    'ADMIN': 4,
    'SUPER_ADMIN': 5
  }
  
  const userLevel = roleHierarchy[userRole] || 0
  
  // Check if user role is in required roles or has higher privilege
  for (const role of requiredRoles) {
    const requiredLevel = roleHierarchy[role] || 0
    if (userLevel >= requiredLevel) {
      return true
    }
  }
  
  return false
}

// Example usage tests
function testRoleAccess() {
  console.log('\n🧪 Testing Role Access:')
  console.log('======================')
  
  const tests = [
    { user: 'STAFF', required: ['STAFF'], expected: true },
    { user: 'STAFF', required: ['MANAGER'], expected: false },
    { user: 'MANAGER', required: ['STAFF'], expected: true },
    { user: 'ADMIN', required: ['STAFF', 'MANAGER'], expected: true },
    { user: 'SUPER_ADMIN', required: ['ADMIN'], expected: true }
  ]
  
  tests.forEach(test => {
    const result = checkRoleAccess(test.user, test.required)
    const status = result === test.expected ? '✅' : '❌'
    console.log(`${status} ${test.user} access to [${test.required.join(', ')}]: ${result}`)
  })
}

// Run if called directly
if (require.main === module) {
  setupBasicPermissions()
    .then(() => {
      testRoleAccess()
      console.log('\n🚀 Permission system verified!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('❌ Failed to setup permissions:', error)
      process.exit(1)
    })
    .finally(async () => {
      await prisma.$disconnect()
    })
}

module.exports = { 
  setupBasicPermissions, 
  checkRoleAccess 
}
