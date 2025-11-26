# 📄 Tesseract OCR Integration - Setup Guide

## 🎯 Overview
This guide helps you set up **Tesseract OCR** for automatic bill/invoice processing in BISMAN ERP.

---

## 📦 Installation Steps

### 1. Install System Dependencies

#### macOS:
```bash
brew install tesseract
brew install poppler  # For PDF to image conversion
```

#### Ubuntu/Debian:
```bash
sudo apt-get update
sudo apt-get install -y tesseract-ocr
sudo apt-get install -y poppler-utils
```

#### Windows:
1. Download Tesseract installer from: https://github.com/UB-Mannheim/tesseract/wiki
2. Install to default location (C:\Program Files\Tesseract-OCR)
3. Add to PATH: `C:\Program Files\Tesseract-OCR`
4. Download poppler for Windows: http://blog.alivate.com.au/poppler-windows/

### 2. Install Node.js Dependencies

Navigate to backend directory and install packages:

```bash
cd my-backend

# Core OCR and PDF processing
npm install node-tesseract-ocr
npm install pdf-poppler
npm install sharp  # Image processing

# File upload handling
npm install multer
npm install @types/multer --save-dev

# Rate limiting
npm install express-rate-limit

# Date parsing
npm install date-fns
```

### 3. Verify Tesseract Installation

```bash
tesseract --version
# Should output: tesseract 5.x.x
```

---

## 🗂️ Directory Structure

The OCR system creates these directories:

```
my-backend/
├── uploads/
│   ├── bills/           # Uploaded bill files
│   └── temp/            # Temporary files for processing
├── services/
│   └── ocrService.ts    # OCR processing logic
├── routes/
│   └── bill.routes.ts   # API endpoints
└── middleware/
    └── upload.ts        # Multer configuration
```

---

## 🔧 Environment Variables

Add to `my-backend/.env`:

```env
# OCR Configuration
TESSERACT_PATH=/usr/local/bin/tesseract  # macOS/Linux
# TESSERACT_PATH=C:\Program Files\Tesseract-OCR\tesseract.exe  # Windows

# File Upload
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760  # 10MB in bytes

# Rate Limiting
OCR_RATE_LIMIT_WINDOW=900000  # 15 minutes
OCR_RATE_LIMIT_MAX=10  # 10 uploads per window
```

---

## 🗄️ Database Migration

After updating Prisma schema, run:

```bash
cd my-backend
npx prisma migrate dev --name add_bill_model
npx prisma generate
```

---

## 🧪 Testing

### Test OCR with sample image:
```bash
curl -X POST http://localhost:4000/api/bills \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "file=@sample_invoice.jpg"
```

### Expected response:
```json
{
  "success": true,
  "billId": "...",
  "ocrStatus": "DONE",
  "parsed": {
    "vendorName": "ABC Suppliers",
    "invoiceNumber": "INV-2024-001",
    "invoiceDate": "2024-01-15",
    "totalAmount": 5000.00
  },
  "suggestedTask": {
    "title": "Payment – ABC Suppliers – ₹5,000.00",
    "description": "Invoice: INV-2024-001\nDate: 2024-01-15\nAmount: ₹5,000.00",
    "dueDate": "2024-01-30"
  }
}
```

---

## 🚨 Troubleshooting

### "Tesseract not found" error:
- Verify installation: `which tesseract` (macOS/Linux) or `where tesseract` (Windows)
- Update TESSERACT_PATH in .env

### "poppler not found" error:
- Install poppler (see step 1)
- For macOS: `brew link poppler`

### Low OCR accuracy:
- Ensure images are high resolution (300+ DPI)
- Images should be well-lit and not skewed
- Use `sharp` to pre-process images (contrast, brightness)

### Memory issues with large PDFs:
- Reduce MAX_FILE_SIZE in .env
- Process PDFs page-by-page (already implemented)

---

## 📊 Supported Formats

- **Images**: JPG, JPEG, PNG, TIFF, BMP
- **Documents**: PDF (converted to images internally)

---

## 🔐 Security Considerations

1. **File Validation**: Only whitelisted file types accepted
2. **Size Limits**: 10MB default (configurable)
3. **Rate Limiting**: 10 uploads per 15 minutes per user
4. **Authentication**: All OCR endpoints require valid JWT
5. **Sandboxing**: OCR runs in isolated process with timeout

---

## 📈 Performance Tips

1. **Optimize Images**: Use Sharp to compress before OCR
2. **Async Processing**: Large files processed in background
3. **Caching**: Store OCR results to avoid re-processing
4. **Queue System**: Consider Bull/BullMQ for high-volume processing

---

## 🎨 Frontend Integration

### Chat Interface (AIVA):
- Upload bill as attachment in task form
- OCR runs automatically
- Fields auto-populate

### Dedicated Bill Upload Page:
- `/bills/upload` - Full OCR interface
- Edit extracted fields
- Create task with one click

---

## 📚 Resources

- Tesseract Documentation: https://tesseract-ocr.github.io/
- node-tesseract-ocr: https://www.npmjs.com/package/node-tesseract-ocr
- Prisma Docs: https://www.prisma.io/docs

---

**✅ Setup Complete!** You're ready to process bills with OCR.
