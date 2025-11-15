#!/bin/bash

# ============================================
# CI/CD Quick Setup Script
# BISMAN ERP Performance Pipeline
# ============================================

set -e

echo "🚀 Setting up CI/CD Performance Pipeline..."
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ┌─────────────────────────────────────────┐
# │ 1. Check Prerequisites                   │
# └─────────────────────────────────────────┘
echo -e "${BLUE}[1/7] Checking prerequisites...${NC}"

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js not found. Please install Node.js 18+${NC}"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${RED}❌ Node.js 18+ required. Current: $(node -v)${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Node.js $(node -v)${NC}"

# Check npm
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm not found${NC}"
    exit 1
fi
echo -e "${GREEN}✅ npm $(npm -v)${NC}"

# Check Docker (optional)
if command -v docker &> /dev/null; then
    echo -e "${GREEN}✅ Docker $(docker --version | cut -d' ' -f3)${NC}"
else
    echo -e "${YELLOW}⚠️  Docker not found (optional for local testing)${NC}"
fi

# Check Git
if ! command -v git &> /dev/null; then
    echo -e "${RED}❌ Git not found${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Git $(git --version | cut -d' ' -f3)${NC}"

echo ""

# ┌─────────────────────────────────────────┐
# │ 2. Install Global Dependencies           │
# └─────────────────────────────────────────┘
echo -e "${BLUE}[2/7] Installing global dependencies...${NC}"

# Install Lighthouse CI
if ! command -v lhci &> /dev/null; then
    echo "Installing Lighthouse CI..."
    npm install -g @lhci/cli lighthouse || echo "Failed to install Lighthouse CI (optional)"
fi

# Install Artillery
if ! command -v artillery &> /dev/null; then
    echo "Installing Artillery..."
    npm install -g artillery@latest || echo "Failed to install Artillery (optional)"
fi

echo -e "${GREEN}✅ Global dependencies installed${NC}"
echo ""

# ┌─────────────────────────────────────────┐
# │ 3. Setup Frontend                        │
# └─────────────────────────────────────────┘
echo -e "${BLUE}[3/7] Setting up frontend...${NC}"

cd my-frontend

# Check if bundle analyzer is installed
if ! grep -q "@next/bundle-analyzer" package.json; then
    echo "Installing bundle analyzer..."
    npm install --save-dev @next/bundle-analyzer
fi

# Add analyze script if not present
if ! grep -q '"analyze"' package.json; then
    echo "Adding analyze script to package.json..."
    # Using jq if available, otherwise manual edit needed
    if command -v jq &> /dev/null; then
        tmp=$(mktemp)
        jq '.scripts.analyze = "ANALYZE=true npm run build"' package.json > "$tmp"
        mv "$tmp" package.json
    else
        echo -e "${YELLOW}⚠️  Please manually add 'analyze' script to my-frontend/package.json:${NC}"
        echo '  "analyze": "ANALYZE=true npm run build"'
    fi
fi

# Check next.config.js for bundle analyzer
if [ -f "next.config.js" ]; then
    if ! grep -q "bundle-analyzer" next.config.js; then
        echo -e "${YELLOW}⚠️  Please configure bundle analyzer in next.config.js${NC}"
        echo "See: CI_CD_PERFORMANCE_GUIDE.md for instructions"
    fi
fi

cd ..
echo -e "${GREEN}✅ Frontend configured${NC}"
echo ""

# ┌─────────────────────────────────────────┐
# │ 4. Create Configuration Files            │
# └─────────────────────────────────────────┘
echo -e "${BLUE}[4/7] Checking configuration files...${NC}"

# Verify workflow exists
if [ ! -f ".github/workflows/performance-ci.yml" ]; then
    echo -e "${RED}❌ Workflow file not found!${NC}"
    exit 1
fi
echo -e "${GREEN}✅ GitHub Actions workflow${NC}"

# Verify Lighthouse config
if [ ! -f "lighthouserc.json" ]; then
    echo -e "${RED}❌ lighthouserc.json not found!${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Lighthouse configuration${NC}"

# Verify Lighthouse budget
if [ ! -f "lighthouse-budget.json" ]; then
    echo -e "${RED}❌ lighthouse-budget.json not found!${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Lighthouse budget${NC}"

# Verify Docker files
if [ -f "Dockerfile.optimized" ]; then
    echo -e "${GREEN}✅ Optimized Dockerfile${NC}"
fi

if [ -f "docker-compose.ci.yml" ]; then
    echo -e "${GREEN}✅ Docker Compose CI${NC}"
fi

echo ""

# ┌─────────────────────────────────────────┐
# │ 5. Test Local Setup                      │
# └─────────────────────────────────────────┘
echo -e "${BLUE}[5/7] Testing local setup...${NC}"

# Test bundle analyzer (if frontend deps installed)
if [ -d "my-frontend/node_modules" ]; then
    echo "Testing bundle build..."
    cd my-frontend
    NODE_ENV=production npm run build > /dev/null 2>&1 || echo -e "${YELLOW}⚠️  Build test failed (dependencies may need install)${NC}"
    cd ..
fi

# Test Lighthouse (if installed)
if command -v lighthouse &> /dev/null; then
    echo -e "${GREEN}✅ Lighthouse CLI ready${NC}"
else
    echo -e "${YELLOW}⚠️  Lighthouse CLI not available for local testing${NC}"
fi

# Test Artillery (if installed)
if command -v artillery &> /dev/null; then
    echo -e "${GREEN}✅ Artillery ready${NC}"
else
    echo -e "${YELLOW}⚠️  Artillery not available for local testing${NC}"
fi

echo ""

# ┌─────────────────────────────────────────┐
# │ 6. GitHub Configuration Check            │
# └─────────────────────────────────────────┘
echo -e "${BLUE}[6/7] Checking GitHub configuration...${NC}"

# Check if we're in a git repository
if [ ! -d ".git" ]; then
    echo -e "${RED}❌ Not a git repository${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Git repository${NC}"

# Check if GitHub Actions is enabled
if [ -d ".github/workflows" ]; then
    echo -e "${GREEN}✅ GitHub Actions directory exists${NC}"
else
    echo -e "${RED}❌ .github/workflows directory not found${NC}"
    exit 1
fi

# Check remote
REMOTE=$(git remote get-url origin 2>/dev/null || echo "")
if [ -n "$REMOTE" ]; then
    echo -e "${GREEN}✅ Git remote: $REMOTE${NC}"
else
    echo -e "${YELLOW}⚠️  No git remote configured${NC}"
fi

echo ""

# ┌─────────────────────────────────────────┐
# │ 7. Setup Instructions                    │
# └─────────────────────────────────────────┘
echo -e "${BLUE}[7/7] Final setup steps...${NC}"
echo ""

echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ Local setup complete!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo -e "${YELLOW}📋 Next Steps:${NC}"
echo ""
echo "1. Configure GitHub Secrets:"
echo "   Go to: Settings → Secrets and variables → Actions"
echo ""
echo "   Add these secrets (recommended):"
echo "   - SLACK_WEBHOOK_URL: Your Slack webhook URL"
echo "   - DOCKER_USERNAME: Docker Hub username (optional)"
echo "   - DOCKER_PASSWORD: Docker Hub password (optional)"
echo ""

echo "2. Get Slack Webhook URL:"
echo "   a. Go to https://api.slack.com/apps"
echo "   b. Create new app → From scratch"
echo "   c. Enable 'Incoming Webhooks'"
echo "   d. Add webhook for your channel"
echo "   e. Copy webhook URL to GitHub secrets"
echo ""

echo "3. Enable GitHub Actions:"
echo "   Go to: Settings → Actions → General"
echo "   Enable: 'Allow all actions and reusable workflows'"
echo ""

echo "4. Test the pipeline:"
echo "   - Make a commit and push to trigger workflow"
echo "   - Or manually trigger: Actions → Performance CI/CD → Run workflow"
echo ""

echo "5. View results:"
echo "   - GitHub → Actions → Performance CI/CD Pipeline"
echo "   - Check artifacts for detailed reports"
echo ""

echo -e "${BLUE}📚 Documentation:${NC}"
echo "   - Full guide: CI_CD_PERFORMANCE_GUIDE.md"
echo "   - Monitoring: MONITORING_SETUP.md"
echo ""

echo -e "${GREEN}🎉 Ready to deploy with performance guardrails!${NC}"
echo ""

# ┌─────────────────────────────────────────┐
# │ Optional: Run Quick Test                 │
# └─────────────────────────────────────────┘
read -p "Run a quick local test now? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo -e "${BLUE}Running quick tests...${NC}"
    
    # Run bundle baseline if possible
    if [ -f "benchmark-baseline.sh" ]; then
        echo "Running baseline benchmark..."
        ./benchmark-baseline.sh
    fi
    
    # Run storage check
    if [ -f "check-storage.sh" ]; then
        echo "Running storage check..."
        ./check-storage.sh
    fi
    
    echo ""
    echo -e "${GREEN}✅ Quick tests complete!${NC}"
fi

echo ""
echo -e "${GREEN}All done! 🚀${NC}"
