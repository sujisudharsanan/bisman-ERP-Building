#!/bin/bash

# ==========================================
# 📦 Tesseract OCR Setup Script
# ==========================================
# This script installs Tesseract OCR and all required dependencies
# for bill/invoice processing in BISMAN ERP

set -e  # Exit on error

echo "🚀 Starting Tesseract OCR Installation..."
echo "=========================================="
echo ""

# Detect OS
OS="$(uname -s)"
case "${OS}" in
    Linux*)     MACHINE=Linux;;
    Darwin*)    MACHINE=Mac;;
    *)          MACHINE="UNKNOWN:${OS}"
esac

echo "🖥️  Detected OS: $MACHINE"
echo ""

# ==========================================
# SYSTEM DEPENDENCIES
# ==========================================

echo "📦 Installing system dependencies..."

if [ "$MACHINE" == "Mac" ]; then
    # macOS
    echo "Installing via Homebrew..."
    
    # Check if Homebrew is installed
    if ! command -v brew &> /dev/null; then
        echo "❌ Homebrew not found. Please install Homebrew first:"
        echo "   /bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
        exit 1
    fi
    
    # Install Tesseract
    if ! command -v tesseract &> /dev/null; then
        echo "Installing Tesseract OCR..."
        brew install tesseract
    else
        echo "✅ Tesseract already installed"
    fi
    
    # Install Poppler (for PDF conversion)
    if ! command -v pdftoppm &> /dev/null; then
        echo "Installing Poppler (PDF tools)..."
        brew install poppler
    else
        echo "✅ Poppler already installed"
    fi
    
elif [ "$MACHINE" == "Linux" ]; then
    # Linux (Ubuntu/Debian)
    echo "Installing via apt..."
    
    # Update package list
    sudo apt-get update
    
    # Install Tesseract
    if ! command -v tesseract &> /dev/null; then
        echo "Installing Tesseract OCR..."
        sudo apt-get install -y tesseract-ocr
    else
        echo "✅ Tesseract already installed"
    fi
    
    # Install Poppler
    if ! command -v pdftoppm &> /dev/null; then
        echo "Installing Poppler (PDF tools)..."
        sudo apt-get install -y poppler-utils
    else
        echo "✅ Poppler already installed"
    fi
    
else
    echo "⚠️  Unsupported OS: $MACHINE"
    echo "Please manually install:"
    echo "  - Tesseract OCR: https://github.com/tesseract-ocr/tesseract"
    echo "  - Poppler: https://poppler.freedesktop.org/"
    exit 1
fi

echo ""
echo "✅ System dependencies installed!"
echo ""

# ==========================================
# VERIFY INSTALLATIONS
# ==========================================

echo "🔍 Verifying installations..."
echo ""

# Check Tesseract
if command -v tesseract &> /dev/null; then
    TESSERACT_VERSION=$(tesseract --version 2>&1 | head -n 1)
    echo "✅ Tesseract: $TESSERACT_VERSION"
    TESSERACT_PATH=$(which tesseract)
    echo "   Path: $TESSERACT_PATH"
else
    echo "❌ Tesseract not found"
    exit 1
fi

# Check Poppler
if command -v pdftoppm &> /dev/null; then
    POPPLER_VERSION=$(pdftoppm -v 2>&1 | head -n 1)
    echo "✅ Poppler: $POPPLER_VERSION"
else
    echo "❌ Poppler not found"
    exit 1
fi

echo ""
echo "=========================================="
echo ""

# ==========================================
# NODE.JS DEPENDENCIES
# ==========================================

echo "📦 Installing Node.js dependencies..."
echo ""

cd "$(dirname "$0")/.."  # Go to backend root

# Install OCR and file processing packages
npm install --save \
    node-tesseract-ocr \
    pdf-poppler \
    sharp \
    multer \
    express-rate-limit \
    date-fns

# Install TypeScript types
npm install --save-dev \
    @types/multer \
    @types/express

echo ""
echo "✅ Node.js dependencies installed!"
echo ""

# ==========================================
# CREATE DIRECTORIES
# ==========================================

echo "📁 Creating upload directories..."

mkdir -p uploads/bills
mkdir -p uploads/temp

echo "✅ Directories created"
echo ""

# ==========================================
# UPDATE .ENV
# ==========================================

echo "⚙️  Updating .env configuration..."

ENV_FILE=".env"

if [ ! -f "$ENV_FILE" ]; then
    echo "Creating new .env file..."
    touch "$ENV_FILE"
fi

# Add OCR configuration if not present
if ! grep -q "TESSERACT_PATH" "$ENV_FILE"; then
    echo "" >> "$ENV_FILE"
    echo "# OCR Configuration" >> "$ENV_FILE"
    echo "TESSERACT_PATH=$TESSERACT_PATH" >> "$ENV_FILE"
    echo "UPLOAD_DIR=./uploads" >> "$ENV_FILE"
    echo "MAX_FILE_SIZE=10485760  # 10MB" >> "$ENV_FILE"
    echo "OCR_RATE_LIMIT_WINDOW=900000  # 15 minutes" >> "$ENV_FILE"
    echo "OCR_RATE_LIMIT_MAX=10" >> "$ENV_FILE"
    echo "✅ OCR configuration added to .env"
else
    echo "✅ OCR configuration already in .env"
fi

echo ""

# ==========================================
# DATABASE MIGRATION
# ==========================================

echo "🗄️  Running database migration..."
echo ""

# Check if Prisma is available
if command -v npx &> /dev/null; then
    echo "Creating Prisma migration for Bill model..."
    npx prisma migrate dev --name add_bill_model --skip-generate
    
    echo "Generating Prisma client..."
    npx prisma generate
    
    echo "✅ Database migration complete"
else
    echo "⚠️  npx not found. Please run manually:"
    echo "   npx prisma migrate dev --name add_bill_model"
    echo "   npx prisma generate"
fi

echo ""

# ==========================================
# SUCCESS SUMMARY
# ==========================================

echo "=========================================="
echo "✅ INSTALLATION COMPLETE!"
echo "=========================================="
echo ""
echo "📋 Summary:"
echo "  ✅ Tesseract OCR installed"
echo "  ✅ Poppler (PDF tools) installed"
echo "  ✅ Node.js dependencies installed"
echo "  ✅ Upload directories created"
echo "  ✅ Environment variables configured"
echo "  ✅ Database migration applied"
echo ""
echo "🎯 Next Steps:"
echo "  1. Start your backend server:"
echo "     npm run dev"
echo ""
echo "  2. Test OCR endpoint:"
echo "     curl -X POST http://localhost:4000/api/bills \\"
echo "       -H \"Authorization: Bearer YOUR_TOKEN\" \\"
echo "       -F \"file=@sample_invoice.jpg\""
echo ""
echo "  3. Check the documentation:"
echo "     cat OCR_SETUP_GUIDE.md"
echo ""
echo "=========================================="
echo "🚀 Ready to process bills with OCR!"
echo "=========================================="
