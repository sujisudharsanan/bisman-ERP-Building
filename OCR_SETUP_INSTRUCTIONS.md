# Tesseract OCR Integration - Setup Instructions

## 🚀 Installation Steps

### 1. Install System Dependencies (macOS)

```bash
# Install Tesseract OCR engine
brew install tesseract

# Install additional language data (optional, for better accuracy)
brew install tesseract-lang

# Verify installation
tesseract --version
```

### 2. Backend Dependencies

```bash
cd my-backend

# Core OCR dependencies
npm install node-tesseract-ocr@2.2.1
npm install tesseract.js@4.1.1

# PDF processing
npm install pdf-poppler@0.2.1
npm install pdf-parse@1.1.1

# Image processing
npm install sharp@0.32.6

# Rate limiting
npm install express-rate-limit@7.1.5

# Additional utilities
npm install date-fns@2.30.0

# Dev dependencies
npm install --save-dev @types/pdf-parse
```

### 3. Frontend Dependencies

```bash
cd my-frontend

# Already installed: Tailwind, TypeScript, React
# No additional dependencies needed
```

### 4. Database Migration

```bash
cd my-backend

# Create migration file
npx prisma migrate dev --name add_bill_ocr_tables

# Generate Prisma Client
npx prisma generate
```

### 5. Environment Variables

Add to `my-backend/.env`:

```env
# OCR Configuration
TESSERACT_PATH=/opt/homebrew/bin/tesseract
OCR_UPLOAD_PATH=./uploads/bills
OCR_TEMP_PATH=./uploads/temp
OCR_MAX_FILE_SIZE=10485760
OCR_ALLOWED_TYPES=image/jpeg,image/png,image/jpg,application/pdf
OCR_RATE_LIMIT_WINDOW=900000
OCR_RATE_LIMIT_MAX=10

# Existing settings
NEXT_PUBLIC_API_URL=http://localhost:5000
DATABASE_URL=postgresql://user:password@localhost:5432/BISMAN
JWT_SECRET=your-secret-key
```

### 6. Create Upload Directories

```bash
cd my-backend
mkdir -p uploads/bills
mkdir -p uploads/temp
chmod 755 uploads/bills
chmod 755 uploads/temp
```

### 7. System Requirements

**Minimum:**
- Node.js 18+
- PostgreSQL 14+
- 2GB RAM
- 10GB disk space for uploads

**Recommended:**
- Node.js 20+
- PostgreSQL 15+
- 4GB RAM
- 50GB disk space
- SSD for faster OCR processing

### 8. Production Deployment

**For Linux (Ubuntu/Debian):**

```bash
# Install Tesseract
sudo apt-get update
sudo apt-get install -y tesseract-ocr
sudo apt-get install -y libtesseract-dev
sudo apt-get install -y tesseract-ocr-eng

# Install Poppler (for PDF processing)
sudo apt-get install -y poppler-utils

# Verify installation
tesseract --version
pdfinfo -v
```

**For Docker:**

```dockerfile
FROM node:20-alpine

# Install Tesseract and dependencies
RUN apk add --no-cache \
    tesseract-ocr \
    tesseract-ocr-data-eng \
    poppler-utils \
    imagemagick

# Set Tesseract path
ENV TESSERACT_PATH=/usr/bin/tesseract

# Continue with your app setup...
```

### 9. Performance Tuning

**PostgreSQL Configuration:**

```sql
-- Increase JSON storage performance
ALTER TABLE bills ALTER COLUMN parsed_json SET STORAGE EXTENDED;
ALTER TABLE bills ALTER COLUMN ocr_text SET STORAGE EXTERNAL;

-- Add indexes for faster queries
CREATE INDEX idx_bills_ocr_status ON bills(ocr_status);
CREATE INDEX idx_bills_uploaded_by ON bills(uploaded_by_id);
CREATE INDEX idx_bills_created_at ON bills(created_at DESC);
CREATE INDEX idx_bills_task_id ON bills(task_id) WHERE task_id IS NOT NULL;
```

**Node.js Tuning:**

```bash
# Increase Node.js memory for OCR processing
export NODE_OPTIONS="--max-old-space-size=4096"
```

### 10. Monitoring & Logging

Install monitoring tools:

```bash
cd my-backend
npm install winston@3.11.0
npm install morgan@1.10.0
npm install @sentry/node@7.91.0  # Optional, for error tracking
```

### 11. Testing

```bash
cd my-backend

# Run tests (after implementation)
npm test

# Test OCR endpoint
curl -X POST http://localhost:5000/api/bills \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@test-invoice.pdf"
```

### 12. Security Checklist

- [ ] JWT authentication enabled
- [ ] Rate limiting configured
- [ ] File type validation active
- [ ] File size limits enforced
- [ ] Upload directory permissions set (755)
- [ ] CORS properly configured
- [ ] SQL injection prevention (Prisma ORM)
- [ ] XSS prevention (input sanitization)
- [ ] CSRF tokens for forms
- [ ] HTTPS enabled in production
- [ ] Sensitive data encrypted at rest

### 13. Backup Strategy

```bash
# Backup uploads directory
tar -czf bills-backup-$(date +%Y%m%d).tar.gz uploads/bills/

# Backup database
pg_dump BISMAN > bisman-backup-$(date +%Y%m%d).sql
```

### 14. Troubleshooting

**Issue: Tesseract not found**
```bash
# Find Tesseract path
which tesseract

# Update .env with correct path
TESSERACT_PATH=/path/to/tesseract
```

**Issue: PDF conversion fails**
```bash
# Install poppler
brew install poppler  # macOS
sudo apt-get install poppler-utils  # Linux
```

**Issue: Memory errors during OCR**
```bash
# Increase Node.js memory
export NODE_OPTIONS="--max-old-space-size=8192"
```

**Issue: Slow OCR processing**
- Use image preprocessing (reduce size, increase contrast)
- Process PDFs page by page
- Implement job queue for async processing
- Consider horizontal scaling with worker nodes

### 15. Maintenance

**Daily:**
- Monitor error logs
- Check disk space usage
- Review failed OCR jobs

**Weekly:**
- Clean up temp files older than 7 days
- Review OCR accuracy metrics
- Check database performance

**Monthly:**
- Update dependencies
- Review and archive old bills
- Performance optimization review
- Security audit

---

## 🎯 Quick Start (Development)

```bash
# Terminal 1: Start backend
cd my-backend
npm install
npm run dev

# Terminal 2: Start frontend
cd my-frontend
npm install
npm run dev

# Terminal 3: Test OCR
cd my-backend
node scripts/test-ocr.js
```

---

## 📊 Expected Performance

- **Small image (< 1MB):** 2-5 seconds
- **Large image (> 5MB):** 10-20 seconds
- **PDF (1-5 pages):** 15-60 seconds
- **PDF (> 5 pages):** 1-5 minutes

Performance varies based on:
- Image quality and resolution
- File size
- System resources
- Number of concurrent requests

---

## 🔐 Security Notes

1. **Never commit** `.env` files
2. **Always validate** file uploads
3. **Sanitize** OCR extracted text before storing
4. **Rate limit** OCR endpoints aggressively
5. **Monitor** for abuse patterns
6. **Encrypt** sensitive bill data at rest
7. **Implement** audit logging for compliance
8. **Regular** security updates

---

## 📚 Additional Resources

- [Tesseract OCR Documentation](https://tesseract-ocr.github.io/)
- [Node-Tesseract-OCR GitHub](https://github.com/zapolnoch/node-tesseract-ocr)
- [Tesseract.js Documentation](https://tesseract.projectnaptha.com/)
- [Prisma Best Practices](https://www.prisma.io/docs/guides/performance-and-optimization)

---

**Status:** Ready for Implementation  
**Last Updated:** November 26, 2024  
**Version:** 1.0.0
