#!/bin/bash

# Mattermost AI Quick Start Script
# This script helps you deploy the AI connector to Railway

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}"
echo "╔══════════════════════════════════════════╗"
echo "║   🤖 Mattermost AI Quick Deployer       ║"
echo "╚══════════════════════════════════════════╝"
echo -e "${NC}"
echo ""

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo -e "${RED}❌ Railway CLI not found!${NC}"
    echo ""
    echo "Install Railway CLI:"
    echo "  npm install -g @railway/cli"
    echo ""
    echo "Then login:"
    echo "  railway login"
    exit 1
fi

echo -e "${GREEN}✅ Railway CLI found${NC}"
echo ""

# Check if we're in the right directory
if [ ! -f "server.js" ]; then
    echo -e "${RED}❌ Error: server.js not found${NC}"
    echo "Please run this script from the mattermost-ai directory:"
    echo "  cd /Users/abhi/Desktop/BISMAN\\ ERP/mattermost-ai"
    exit 1
fi

echo -e "${GREEN}✅ In correct directory${NC}"
echo ""

# Check if .env file exists and has OpenAI key
if [ -f ".env" ]; then
    OPENAI_KEY=$(grep "^OPENAI_API_KEY=" .env | cut -d '=' -f2)
    if [[ $OPENAI_KEY == sk-* ]]; then
        echo -e "${GREEN}✅ OpenAI API key configured${NC}"
    else
        echo -e "${YELLOW}⚠️  OpenAI API key not set or invalid${NC}"
        echo ""
        echo "Please update .env file with your OpenAI API key:"
        echo "  OPENAI_API_KEY=sk-your-actual-key-here"
        echo ""
        echo "Get your key from: https://platform.openai.com/api-keys"
        echo ""
        read -p "Press Enter when ready to continue..."
    fi
else
    echo -e "${RED}❌ .env file not found${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Ask if user wants to deploy
echo -e "${YELLOW}Ready to deploy to Railway?${NC}"
echo ""
echo "This will:"
echo "  1. Create a new Railway service (or update existing)"
echo "  2. Deploy the AI connector"
echo "  3. Give you a public URL"
echo ""
read -p "Continue? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Deployment cancelled."
    exit 0
fi

echo ""
echo -e "${BLUE}🚀 Deploying to Railway...${NC}"
echo ""

# Deploy to Railway
railway up

echo ""
echo -e "${GREEN}✅ Deployment complete!${NC}"
echo ""

# Get the Railway URL
echo -e "${BLUE}Getting your service URL...${NC}"
RAILWAY_URL=$(railway status --json 2>/dev/null | grep -o 'https://[^"]*' | head -1 || echo "")

if [ -n "$RAILWAY_URL" ]; then
    echo -e "${GREEN}✅ Your service is live at:${NC}"
    echo -e "${BLUE}$RAILWAY_URL${NC}"
    echo ""
else
    echo -e "${YELLOW}⚠️  Could not auto-detect URL${NC}"
    echo "Check Railway dashboard for your service URL"
    echo ""
fi

# Remind user about environment variables
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${YELLOW}📋 Don't forget to set environment variables in Railway!${NC}"
echo ""
echo "Go to Railway dashboard and set:"
echo ""
echo "  OPENAI_API_KEY=sk-your-key"
echo "  MATTERMOST_BOT_TOKEN=your-bot-token"
echo "  MATTERMOST_COMMAND_TOKEN=your-command-token"
echo "  MATTERMOST_BASE_URL=https://mattermost-production-84fd.up.railway.app"
echo ""
echo "Or use CLI:"
echo "  railway variables set OPENAI_API_KEY=sk-..."
echo "  railway variables set MATTERMOST_BOT_TOKEN=..."
echo "  railway variables set MATTERMOST_COMMAND_TOKEN=..."
echo ""

# Next steps
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${GREEN}🎯 Next Steps:${NC}"
echo ""
echo "1. Set environment variables in Railway (see above)"
echo ""
echo "2. Create Bot Account in Mattermost:"
echo "   → https://mattermost-production-84fd.up.railway.app"
echo "   → Main Menu → Integrations → Bot Accounts"
echo "   → Add Bot Account (username: ai-assistant)"
echo "   → Copy the token → Set as MATTERMOST_BOT_TOKEN"
echo ""
echo "3. Create Slash Command in Mattermost:"
echo "   → Main Menu → Integrations → Slash Commands"
echo "   → Command: /ai"
if [ -n "$RAILWAY_URL" ]; then
    echo "   → Request URL: $RAILWAY_URL/mattermost/command"
else
    echo "   → Request URL: https://your-railway-url/mattermost/command"
fi
echo "   → Method: POST"
echo "   → Copy the token → Set as MATTERMOST_COMMAND_TOKEN"
echo ""
echo "4. Test it in Mattermost:"
echo "   → Add @ai-assistant to a channel"
echo "   → Type: /ai What is ERP?"
echo "   → Get AI response! 🎉"
echo ""

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${GREEN}✨ Deployment complete! Follow the steps above to finish setup.${NC}"
echo ""
echo "For detailed instructions, see: SETUP_GUIDE.md"
echo ""
