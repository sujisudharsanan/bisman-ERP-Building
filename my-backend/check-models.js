const { getPrisma } = require('./lib/prisma');
const prisma = getPrisma();
console.log('users_enhanced model:', !!prisma.users_enhanced);
console.log('user model:', !!prisma.user);

// List available models
const models = Object.keys(prisma).filter(k => !k.startsWith('_') && !k.startsWith('$'));
console.log('Available models:', models.slice(0, 30));
process.exit(0);
