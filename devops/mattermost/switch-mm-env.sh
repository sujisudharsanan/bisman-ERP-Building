#!/bin/bash

# Mattermost Environment Switcher
# Switches between Railway (production) and Local Mattermost

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Paths
FRONTEND_DIR="/Users/abhi/Desktop/BISMAN ERP/my-frontend"
ENV_FILE="$FRONTEND_DIR/.env.local"
BACKUP_FILE="$FRONTEND_DIR/.env.local.backup"

# Configuration
RAILWAY_URL="https://mattermost-production-84fd.up.railway.app"
RAILWAY_TOKEN="1y54w4qe4fg3djq186tixu34uc"
LOCAL_URL="http://localhost:8065"

echo "🔄 Mattermost Environment Switcher"
echo "==================================="
echo ""

# Check if env file exists
if [ ! -f "$ENV_FILE" ]; then
    echo -e "${RED}❌ Error: .env.local not found at $ENV_FILE${NC}"
    exit 1
fi

# Function to backup current env
backup_env() {
    cp "$ENV_FILE" "$BACKUP_FILE.$(date +%Y%m%d_%H%M%S)"
    echo -e "${GREEN}✅ Backup created${NC}"
}

# Function to update env variable
update_env() {
    local key=$1
    local value=$2
    
    if grep -q "^${key}=" "$ENV_FILE"; then
        # Update existing
        if [[ "$OSTYPE" == "darwin"* ]]; then
            sed -i '' "s|^${key}=.*|${key}=${value}|" "$ENV_FILE"
        else
            sed -i "s|^${key}=.*|${key}=${value}|" "$ENV_FILE"
        fi
    else
        # Add new
        echo "${key}=${value}" >> "$ENV_FILE"
    fi
}

# Function to switch to Railway
switch_to_railway() {
    echo -e "${BLUE}Switching to Railway Mattermost...${NC}"
    echo ""
    
    backup_env
    
    update_env "MM_BASE_URL" "$RAILWAY_URL"
    update_env "MM_ADMIN_TOKEN" "$RAILWAY_TOKEN"
    
    echo -e "${GREEN}✅ Switched to Railway Mattermost${NC}"
    echo ""
    echo "Configuration:"
    echo "  MM_BASE_URL: $RAILWAY_URL"
    echo "  MM_ADMIN_TOKEN: $RAILWAY_TOKEN"
    echo ""
    echo "Next steps:"
    echo "  1. Restart frontend: npm run dev:both"
    echo "  2. Chat widget will connect to Railway Mattermost"
}

# Function to switch to Local
switch_to_local() {
    echo -e "${BLUE}Switching to Local Mattermost...${NC}"
    echo ""
    
    # Check if local Mattermost is running
    if ! curl -s http://localhost:8065/api/v4/system/ping > /dev/null 2>&1; then
        echo -e "${YELLOW}⚠️  Warning: Local Mattermost not running!${NC}"
        echo ""
        echo "Start it first:"
        echo "  cd ~/mattermost-local/mattermost"
        echo "  ./start-mattermost.sh"
        echo ""
        read -p "Continue anyway? (y/n) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo "Cancelled."
            exit 1
        fi
    fi
    
    # Check if token is configured
    LOCAL_TOKEN=$(grep "^MM_ADMIN_TOKEN=" "$ENV_FILE" | cut -d '=' -f2)
    
    if [ "$LOCAL_TOKEN" = "$RAILWAY_TOKEN" ] || [ -z "$LOCAL_TOKEN" ]; then
        echo -e "${YELLOW}⚠️  Local Mattermost token not configured!${NC}"
        echo ""
        echo "Please generate a Personal Access Token:"
        echo "  1. Open http://localhost:8065"
        echo "  2. Login as admin"
        echo "  3. Profile → Security → Personal Access Tokens"
        echo "  4. Create token: 'ERP Integration'"
        echo ""
        read -p "Enter your local Mattermost token: " NEW_TOKEN
        
        if [ -z "$NEW_TOKEN" ]; then
            echo -e "${RED}❌ No token provided. Cancelled.${NC}"
            exit 1
        fi
        
        LOCAL_TOKEN="$NEW_TOKEN"
    fi
    
    backup_env
    
    update_env "MM_BASE_URL" "$LOCAL_URL"
    update_env "MM_ADMIN_TOKEN" "$LOCAL_TOKEN"
    
    echo -e "${GREEN}✅ Switched to Local Mattermost${NC}"
    echo ""
    echo "Configuration:"
    echo "  MM_BASE_URL: $LOCAL_URL"
    echo "  MM_ADMIN_TOKEN: $LOCAL_TOKEN"
    echo ""
    echo "Next steps:"
    echo "  1. Make sure local Mattermost is running"
    echo "  2. Restart frontend: npm run dev:both"
    echo "  3. Chat widget will connect to local Mattermost"
}

# Function to show current environment
show_current() {
    echo -e "${BLUE}Current Mattermost Configuration:${NC}"
    echo ""
    
    CURRENT_URL=$(grep "^MM_BASE_URL=" "$ENV_FILE" | cut -d '=' -f2)
    CURRENT_TOKEN=$(grep "^MM_ADMIN_TOKEN=" "$ENV_FILE" | cut -d '=' -f2)
    
    if [ -z "$CURRENT_URL" ]; then
        echo -e "${RED}❌ MM_BASE_URL not found in .env.local${NC}"
    else
        echo "  MM_BASE_URL: $CURRENT_URL"
    fi
    
    if [ -z "$CURRENT_TOKEN" ]; then
        echo -e "${RED}❌ MM_ADMIN_TOKEN not found in .env.local${NC}"
    else
        echo "  MM_ADMIN_TOKEN: ${CURRENT_TOKEN:0:10}...${CURRENT_TOKEN: -5}"
    fi
    
    echo ""
    
    if [[ "$CURRENT_URL" == *"railway.app"* ]]; then
        echo -e "${GREEN}Currently using: Railway Mattermost ☁️${NC}"
    elif [[ "$CURRENT_URL" == *"localhost"* ]]; then
        echo -e "${GREEN}Currently using: Local Mattermost 💻${NC}"
        
        # Check if local is running
        if curl -s http://localhost:8065/api/v4/system/ping > /dev/null 2>&1; then
            echo -e "${GREEN}Status: Running ✅${NC}"
        else
            echo -e "${RED}Status: Not running ❌${NC}"
            echo "Start it: cd ~/mattermost-local/mattermost && ./start-mattermost.sh"
        fi
    else
        echo -e "${YELLOW}Currently using: Unknown environment${NC}"
    fi
}

# Main menu
if [ $# -eq 0 ]; then
    show_current
    echo ""
    echo "Usage:"
    echo "  $0 railway    # Switch to Railway Mattermost"
    echo "  $0 local      # Switch to Local Mattermost"
    echo "  $0 status     # Show current configuration"
    echo ""
    exit 0
fi

case "$1" in
    railway|prod|production)
        switch_to_railway
        ;;
    local|dev|development)
        switch_to_local
        ;;
    status|show|current)
        show_current
        ;;
    *)
        echo -e "${RED}❌ Unknown option: $1${NC}"
        echo ""
        echo "Usage:"
        echo "  $0 railway    # Switch to Railway Mattermost"
        echo "  $0 local      # Switch to Local Mattermost"
        echo "  $0 status     # Show current configuration"
        exit 1
        ;;
esac
