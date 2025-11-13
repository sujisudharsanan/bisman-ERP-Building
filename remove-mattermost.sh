#!/bin/bash

# BISMAN ERP - Mattermost Removal Script
# Removes all Mattermost files, configurations, and dependencies

echo "🗑️  Starting Mattermost removal process..."
echo ""

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

REMOVED_COUNT=0

# Function to remove file
remove_file() {
    if [ -f "$1" ]; then
        rm "$1"
        REMOVED_COUNT=$((REMOVED_COUNT + 1))
        echo -e "${GREEN}✓${NC} Removed: $1"
    fi
}

# Function to remove directory
remove_dir() {
    if [ -d "$1" ]; then
        rm -rf "$1"
        echo -e "${GREEN}✓${NC} Removed directory: $1"
    fi
}

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  STEP 1: Removing Mattermost Directories"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Remove mattermost-ai directory
remove_dir "mattermost-ai"

# Remove devops/mattermost directory
remove_dir "devops/mattermost"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  STEP 2: Removing Mattermost Scripts"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Root level scripts
remove_file "reset-mattermost-user.js"
remove_file "test-mattermost-integration.sh"
remove_file "test-mattermost-login.js"
remove_file "test-mattermost-bot.sh"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  STEP 3: Removing Backend Mattermost Files"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Backend files
remove_file "my-backend/routes/mattermostBot.js"
remove_file "my-backend/__tests__/mattermost.vocab.test.js"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  STEP 4: Removing Frontend Mattermost Files"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Frontend files
remove_file "my-frontend/src/lib/mattermostClient.ts"
remove_file "my-frontend/src/components/chat/MattermostEmbed.tsx"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  STEP 5: Cleaning Environment Variables"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo -e "${YELLOW}⚠${NC}  Environment files need manual cleanup:"
echo "  • my-frontend/.env.local - Remove MM_BASE_URL"
echo "  • my-frontend/.env.template - Remove MATTERMOST sections"
echo "  • my-frontend/.env.example - Remove MATTERMOST sections"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  STEP 6: Checking for Additional References"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Search for remaining references
echo "Searching for remaining Mattermost references..."
REFS=$(grep -r "mattermost\|Mattermost\|MATTERMOST" . --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=.next --exclude-dir=docs 2>/dev/null | wc -l)
echo -e "${YELLOW}ℹ${NC}  Found $REFS remaining references (may include docs)"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✅ Mattermost Removal Complete!${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📊 Summary:"
echo "  • Removed mattermost-ai directory"
echo "  • Removed devops/mattermost directory"
echo "  • Removed all Mattermost scripts"
echo "  • Removed backend Mattermost files"
echo "  • Removed frontend Mattermost components"
echo ""
echo -e "${YELLOW}⚠  Manual Steps Required:${NC}"
echo "  1. Clean environment variables from .env files"
echo "  2. Review package.json for Mattermost dependencies"
echo "  3. Check for any remaining Mattermost imports in code"
echo "  4. Run: git status to review changes"
echo ""
