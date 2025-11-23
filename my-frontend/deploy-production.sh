#!/bin/bash
# Production Deployment Script for BISMAN ERP
# Run this script to deploy the application to production

set -e  # Exit on error

echo "🚀 BISMAN ERP - Production Deployment"
echo "======================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Error: package.json not found. Please run from the my-frontend directory.${NC}"
    exit 1
fi

echo "📋 Step 1: Checking environment..."
if [ -f ".env.production" ]; then
    echo -e "${GREEN}✅ Production environment file found${NC}"
else
    echo -e "${YELLOW}⚠️  Warning: .env.production not found. Using default environment.${NC}"
fi

echo ""
echo "📋 Step 2: Installing dependencies..."
npm ci --production=false
echo -e "${GREEN}✅ Dependencies installed${NC}"

echo ""
echo "📋 Step 3: Running type check..."
npm run type-check
echo -e "${GREEN}✅ Type check passed${NC}"

echo ""
echo "📋 Step 4: Running linter..."
npm run lint || echo -e "${YELLOW}⚠️  Linting completed with warnings${NC}"
echo -e "${GREEN}✅ Linter completed${NC}"

echo ""
echo "📋 Step 5: Building production bundle..."
export NODE_ENV=production
npm run build
echo -e "${GREEN}✅ Production build completed${NC}"

echo ""
echo "📋 Step 6: Checking build output..."
if [ -d ".next/standalone" ]; then
    echo -e "${GREEN}✅ Standalone build created successfully${NC}"
    BUILD_SIZE=$(du -sh .next | cut -f1)
    echo "   Build size: $BUILD_SIZE"
else
    echo -e "${RED}❌ Error: Standalone build not found${NC}"
    exit 1
fi

echo ""
echo "======================================"
echo -e "${GREEN}🎉 Production build completed successfully!${NC}"
echo ""
echo "📦 Next steps:"
echo "   1. Review the build output in .next/standalone"
echo "   2. Set production environment variables"
echo "   3. Deploy to your hosting provider:"
echo ""
echo "      Railway:"
echo "        railway up"
echo ""
echo "      Docker:"
echo "        docker build -t bisman-erp:latest ."
echo "        docker run -p 3000:3000 bisman-erp:latest"
echo ""
echo "      Manual:"
echo "        node .next/standalone/server.js"
echo ""
echo "======================================"
