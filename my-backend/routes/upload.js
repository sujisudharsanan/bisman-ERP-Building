const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const { getPrisma } = require('../lib/prisma');
const { authenticate } = require('../middleware/auth');
const path = require('path');
const fs = require('fs');

const prisma = getPrisma();

// POST /api/upload/profile-pic
router.post('/profile-pic', authenticate, (req, res) => {
  // Apply multer middleware first, then handle the upload
  upload.single('profile_pic')(req, res, async (err) => {
    if (err) {
      console.error('Multer error:', err);
      
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ 
          error: 'File too large',
          message: 'File size must be less than 2MB' 
        });
      }
      
      if (err.message.includes('Only image files')) {
        return res.status(400).json({ 
          error: 'Invalid file type',
          message: err.message 
        });
      }
      
      return res.status(400).json({ 
        error: 'Upload error',
        message: err.message 
      });
    }

    try {
      // Check if file was uploaded
      if (!req.file) {
        return res.status(400).json({ 
          error: 'No file uploaded',
          message: 'Please select an image file to upload' 
        });
      }

      const userId = req.user.id;
      const filename = req.file.filename;
      const profilePicUrl = `/uploads/profile_pics/${filename}`;

      console.log('File uploaded:', {
        originalName: req.file.originalname,
        filename: filename,
        size: req.file.size,
        userId: userId
      });

      // Get current user to check for existing profile picture
      const currentUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { profile_pic_url: true }
      });

      // Delete old profile picture if it exists
      if (currentUser?.profile_pic_url) {
        const oldFilePath = path.join(__dirname, '..', currentUser.profile_pic_url);
        if (fs.existsSync(oldFilePath)) {
          try {
            fs.unlinkSync(oldFilePath);
            console.log('Deleted old profile picture:', oldFilePath);
          } catch (deleteError) {
            console.warn('Could not delete old profile picture:', deleteError.message);
          }
        }
      }

      // Update user's profile picture URL in database
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: { profile_pic_url: profilePicUrl },
        select: {
          id: true,
          username: true,
          email: true,
          profile_pic_url: true
        }
      });

      res.json({
        success: true,
        message: 'Profile picture uploaded successfully',
        url: profilePicUrl,
        user: updatedUser
      });

    } catch (error) {
      console.error('Profile picture upload error:', error);

      // Clean up uploaded file if database update failed
      if (req.file && req.file.path) {
        try {
          fs.unlinkSync(req.file.path);
          console.log('Cleaned up failed upload file');
        } catch (cleanupError) {
          console.warn('Could not clean up failed upload:', cleanupError.message);
        }
      }

      res.status(500).json({ 
        error: 'Upload failed',
        message: 'An error occurred while uploading the profile picture' 
      });
    }
  });
});

// GET /api/upload/profile-pic (get current user's profile picture)
router.get('/profile-pic', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { 
        profile_pic_url: true,
        username: true,
        email: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      success: true,
      profile_pic_url: user.profile_pic_url,
      user: user
    });

  } catch (error) {
    console.error('Get profile picture error:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve profile picture',
      message: error.message 
    });
  }
});

module.exports = router;
