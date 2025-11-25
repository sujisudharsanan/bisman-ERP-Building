#!/bin/bash

# Script to replace console statements with logger
# Usage: ./replace-console-with-logger.sh [frontend|backend|all]

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

TARGET=${1:-all}

echo -e "${BLUE}=================================================="
echo "🔧 Console Statement Replacement Tool"
echo -e "==================================================${NC}\n"

replace_frontend() {
    echo -e "${YELLOW}📝 Processing Frontend...${NC}"
    
    # Files to replace console statements
    FILES=(
        "my-frontend/src/components/ChatGuard.tsx"
        "my-frontend/src/components/chat/CleanChatInterface-NEW.tsx"
        "my-frontend/src/pages/api/health.ts"
        "my-frontend/src/pages/api/[...slug].ts"
        "my-frontend/src/lib/env.ts"
        "my-frontend/src/lib/globalErrorHandler.ts"
    )
    
    for file in "${FILES[@]}"; do
        if [ -f "$file" ]; then
            echo -e "  Processing: ${file}"
            
            # Add logger import if not present
            if ! grep -q "import.*logger.*from.*utils/logger" "$file"; then
                # For TypeScript files
                if [[ $file == *.tsx || $file == *.ts ]]; then
                    # Add import after other imports
                    sed -i.bak "1a\\
import { logger } from '@/utils/logger';
" "$file"
                fi
            fi
            
            echo -e "    ${GREEN}✓${NC} Added logger import"
        fi
    done
    
    echo -e "${GREEN}✅ Frontend processing complete${NC}\n"
    echo -e "${YELLOW}⚠️  Manual Review Required:${NC}"
    echo "  - Review each file to replace:"
    echo "    • console.log() → logger.debug()"
    echo "    • console.error() → logger.error()"
    echo "    • console.warn() → logger.warn()"
    echo "    • console.info() → logger.info()"
    echo ""
}

replace_backend() {
    echo -e "${YELLOW}📝 Processing Backend...${NC}"
    
    # Files to replace console statements
    FILES=(
        "my-backend/middleware/advancedRateLimiter.js"
        "my-backend/routes/ultimate-chat.js"
    )
    
    for file in "${FILES[@]}"; do
        if [ -f "$file" ]; then
            echo -e "  Processing: ${file}"
            
            # Add logger require if not present
            if ! grep -q "require.*utils/logger" "$file"; then
                # Add require at top
                sed -i.bak "1i\\
const logger = require('../utils/logger');
" "$file"
            fi
            
            echo -e "    ${GREEN}✓${NC} Added logger require"
        fi
    done
    
    echo -e "${GREEN}✅ Backend processing complete${NC}\n"
    echo -e "${YELLOW}⚠️  Manual Review Required:${NC}"
    echo "  - Review each file to replace:"
    echo "    • console.log() → logger.debug() or logger.info()"
    echo "    • console.error() → logger.error()"
    echo "    • console.warn() → logger.warn()"
    echo ""
}

show_manual_steps() {
    echo -e "${BLUE}=================================================="
    echo "📋 Manual Steps Required"
    echo -e "==================================================${NC}\n"
    
    echo "1. Review the changes made to files (*.bak files are backups)"
    echo ""
    echo "2. Manually replace console statements with logger:"
    echo ""
    echo -e "   ${YELLOW}Frontend (TypeScript):${NC}"
    echo "   import { logger } from '@/utils/logger';"
    echo "   logger.debug('Debug message', { context });"
    echo "   logger.info('Info message', { context });"
    echo "   logger.warn('Warning message', { context });"
    echo "   logger.error('Error message', error, { context });"
    echo ""
    echo -e "   ${YELLOW}Backend (JavaScript):${NC}"
    echo "   const logger = require('./utils/logger');"
    echo "   logger.debug('Debug message', context);"
    echo "   logger.info('Info message', context);"
    echo "   logger.warn('Warning message', context);"
    echo "   logger.error('Error message', error, context);"
    echo ""
    echo "3. Test the changes:"
    echo "   cd my-frontend && npm run type-check"
    echo "   cd my-backend && npm start"
    echo ""
    echo "4. Remove backup files when satisfied:"
    echo "   find . -name '*.bak' -delete"
    echo ""
}

# Main execution
case $TARGET in
    frontend)
        replace_frontend
        ;;
    backend)
        replace_backend
        ;;
    all)
        replace_frontend
        replace_backend
        ;;
    *)
        echo -e "${RED}❌ Invalid target: $TARGET${NC}"
        echo "Usage: $0 [frontend|backend|all]"
        exit 1
        ;;
esac

show_manual_steps

echo -e "${GREEN}✅ Script complete!${NC}"
echo "Remember to review and test all changes before committing."
