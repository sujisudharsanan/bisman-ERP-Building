// Test script to verify super admin login
const bcrypt = require('bcryptjs');

const testCredentials = {
  email: 'suji@gmail.com',
  password: 'Password@123',
  storedHash: '$2a$10$87KW9fKVsaD7OSa.QqmUou2ReJm07Samzc5t3tC04I7e8eunAkiNC'
};

console.log('🔐 Super Admin Credentials Test');
console.log('================================');
console.log('Email:', testCredentials.email);
console.log('Password:', testCredentials.password);
console.log('');

// Test password verification
const isValidPassword = bcrypt.compareSync(testCredentials.password, testCredentials.storedHash);
console.log('Password verification:', isValidPassword ? '✅ VALID' : '❌ INVALID');

if (isValidPassword) {
  console.log('');
  console.log('🎉 Super Admin credentials are ready!');
  console.log('');
  console.log('📋 Login Instructions:');
  console.log('1. Navigate to: http://localhost:3000/auth/login');
  console.log('2. Enter email: suji@gmail.com');
  console.log('3. Enter password: Password@123');
  console.log('4. After login, go to: http://localhost:3000/super-admin');
  console.log('');
  console.log('🚀 Super Admin Control Panel Features:');
  console.log('- Dashboard with real-time statistics');
  console.log('- User management with CRUD operations');
  console.log('- Database explorer for all tables');
  console.log('- Activity tracking and audit logs');
  console.log('- Role and permission management');
} else {
  console.log('❌ Password verification failed!');
}
