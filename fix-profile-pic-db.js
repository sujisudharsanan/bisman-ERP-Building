/**
 * Fix Profile Picture Database Issue
 * This script checks and updates the profile_pic_url in the database
 */

const { getPrisma } = require('./my-backend/lib/prisma');
const fs = require('fs');
const path = require('path');

const prisma = getPrisma();

async function fixProfilePictures() {
  try {
    console.log('🔍 Checking profile pictures directory...');
    
    const uploadsDir = path.join(__dirname, 'my-backend', 'uploads', 'profile_pics');
    
    if (!fs.existsSync(uploadsDir)) {
      console.log('❌ Profile pictures directory does not exist');
      return;
    }
    
    const files = fs.readdirSync(uploadsDir).filter(f => f.endsWith('.webp') || f.endsWith('.jpg') || f.endsWith('.png'));
    console.log(`📁 Found ${files.length} profile picture files`);
    
    if (files.length === 0) {
      console.log('ℹ️  No profile pictures to process');
      return;
    }
    
    // Get the most recent file (assuming it's your upload)
    const stats = files.map(f => ({
      name: f,
      time: fs.statSync(path.join(uploadsDir, f)).mtime.getTime()
    }));
    stats.sort((a, b) => b.time - a.time);
    
    const latestFile = stats[0].name;
    console.log(`📸 Latest profile picture: ${latestFile}`);
    
    // Check which users don't have profile_pic_url set
    const usersWithoutPic = await prisma.user.findMany({
      where: {
        OR: [
          { profile_pic_url: null },
          { profile_pic_url: '' }
        ]
      },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        profile_pic_url: true
      }
    });
    
    console.log(`\n👥 Users without profile picture: ${usersWithoutPic.length}`);
    usersWithoutPic.forEach(u => {
      console.log(`   - ${u.username || u.email} (ID: ${u.id}, Role: ${u.role})`);
    });
    
    // Ask if you want to update a specific user
    if (usersWithoutPic.length > 0) {
      console.log('\n🔧 To update a user\'s profile picture, run:');
      console.log('node fix-profile-pic-db.js update <userId>');
      console.log('\nExample:');
      console.log(`node fix-profile-pic-db.js update ${usersWithoutPic[0].id}`);
    }
    
    // If "update" command is provided
    if (process.argv[2] === 'update' && process.argv[3]) {
      const userId = parseInt(process.argv[3]);
      const profilePicUrl = `/uploads/profile_pics/${latestFile}`;
      
      console.log(`\n🔄 Updating user ${userId} with profile picture: ${profilePicUrl}`);
      
      const updated = await prisma.user.update({
        where: { id: userId },
        data: { profile_pic_url: profilePicUrl },
        select: {
          id: true,
          username: true,
          email: true,
          profile_pic_url: true
        }
      });
      
      console.log('✅ Profile picture updated successfully!');
      console.log(JSON.stringify(updated, null, 2));
      console.log('\n🎉 Now refresh your browser to see the profile picture!');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

fixProfilePictures();
