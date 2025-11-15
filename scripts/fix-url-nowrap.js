const { getPrisma } = require('./my-backend/lib/prisma');
const prisma = getPrisma();

async function fixUrl() {
  const correctUrl = '/uploads/profile_pics/profile_1763049472314-839936665.webp';
  
  const updated = await prisma.user.update({
    where: { id: 48 },
    data: { profile_pic_url: correctUrl },
    select: { id: true, username: true, profile_pic_url: true }
  });
  
  console.log('Updated user:', updated);
  console.log('URL length:', updated.profile_pic_url.length);
  console.log('Contains newline:', updated.profile_pic_url.includes('\n'));
  
  await prisma.$disconnect();
}

fixUrl();
