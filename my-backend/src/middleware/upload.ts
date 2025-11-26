/**
 * 📁 Multer Upload Middleware
 * 
 * Handles file uploads for bills/invoices
 * Features:
 * - File type validation
 * - Size limits
 * - Secure file naming
 * - Organization into folders
 */

import multer, { type File as MulterFile } from 'multer';
import path from 'path';
import fs from 'fs';

// ==========================================
// CONFIGURATION
// ==========================================

const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'bills');
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE || '10485760'); // 10MB default

// Allowed file types
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/tiff',
  'image/bmp',
  'application/pdf',
];

const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.tiff', '.tif', '.bmp', '.pdf'];

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// ==========================================
// STORAGE CONFIGURATION
// ==========================================

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    // Generate secure filename: timestamp-random-originalname
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const ext = path.extname(file.originalname).toLowerCase();
    const baseName = path.basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9]/g, '_') // Sanitize
      .substring(0, 50); // Limit length

    const filename = `${timestamp}-${randomStr}-${baseName}${ext}`;
    cb(null, filename);
  },
});

// ==========================================
// FILE FILTER
// ==========================================

const fileFilter = (req: any, file: MulterFile, cb: multer.FileFilterCallback) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const mimeType = file.mimetype.toLowerCase();

  // Check MIME type
  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    return cb(new Error(`Invalid file type. Allowed: ${ALLOWED_MIME_TYPES.join(', ')}`));
  }

  // Check extension
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return cb(new Error(`Invalid file extension. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`));
  }

  cb(null, true);
};

// ==========================================
// MULTER INSTANCE
// ==========================================

export const billUpload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1, // Only one bill at a time
  },
  fileFilter,
});

// ==========================================
// ERROR HANDLER
// ==========================================

export function handleUploadError(error: any, req: any, res: any, next: any) {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: `File too large. Maximum size: ${MAX_FILE_SIZE / (1024 * 1024)}MB`,
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        error: 'Too many files. Please upload one bill at a time.',
      });
    }
    return res.status(400).json({
      success: false,
      error: `Upload error: ${error.message}`,
    });
  }

  if (error) {
    return res.status(400).json({
      success: false,
      error: error.message || 'File upload failed',
    });
  }

  next();
}

// ==========================================
// HELPER FUNCTIONS
// ==========================================

/**
 * Delete uploaded file (cleanup on error)
 */
export async function deleteUploadedFile(filePath: string): Promise<void> {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`[Upload] Deleted file: ${filePath}`);
    }
  } catch (error) {
    console.error('[Upload] Failed to delete file:', error);
  }
}

/**
 * Get file info
 */
export function getFileInfo(file: MulterFile) {
  return {
    originalName: file.originalname,
    filename: file.filename,
    path: file.path,
    size: file.size,
    mimeType: file.mimetype,
    uploadedAt: new Date().toISOString(),
  };
}
