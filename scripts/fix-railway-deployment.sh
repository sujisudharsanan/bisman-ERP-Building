#!/bin/bash
set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
echo -e "${BLUE}   BISMAN ERP - Railway Deployment Fix Script     ${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
echo ""

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo -e "${RED}❌ Railway CLI not found${NC}"
    echo "Install with: npm install -g @railway/cli"
    exit 1
fi

# Check current Railway status
echo -e "${YELLOW}Checking Railway status...${NC}"
railway status || echo -e "${YELLOW}⚠️  Not linked to a service${NC}"
echo ""

# Option selection
echo -e "${GREEN}Choose fix option:${NC}"
echo "1. 🚀 Quick fix - Backend-only Dockerfile (RECOMMENDED)"
echo "2. 🔍 Diagnose - View Railway logs and check issues"
echo "3. 🧹 Clear cache - Force rebuild from scratch"
echo "4. 🛠️  Advanced - Create separate backend/frontend services"
echo "5. 📋 All of the above"
echo ""
read -p "Enter option (1-5): " OPTION

case $OPTION in
  1)
    echo -e "${BLUE}═══ Creating simplified backend-only Dockerfile ═══${NC}"
    
    # Backup current Dockerfile
    if [ -f "Dockerfile" ]; then
        BACKUP_FILE="Dockerfile.backup.$(date +%Y%m%d_%H%M%S)"
        cp Dockerfile "$BACKUP_FILE"
        echo -e "${GREEN}✅ Backed up current Dockerfile to $BACKUP_FILE${NC}"
    fi
    
    # Create simplified Dockerfile
    cat > Dockerfile << 'EOF'
FROM node:20-alpine

# Install system dependencies
RUN apk add --no-cache \
    postgresql-client \
    openssl \
    libc6-compat \
    dumb-init

WORKDIR /app

# Copy package files for backend
COPY my-backend/package*.json ./
COPY my-backend/prisma ./prisma/

# Install production dependencies only
RUN npm ci --only=production --ignore-scripts && \
    npm cache clean --force

# Copy backend application code
COPY my-backend/ ./

# Generate Prisma client
RUN npx prisma generate

# Set environment variables
ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

# Add healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8080/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Copy and set permissions for start script
COPY scripts/start-railway.sh /start.sh
RUN chmod +x /start.sh

# Start with dumb-init to handle signals properly
CMD ["dumb-init", "/start.sh"]
EOF
    
    echo -e "${GREEN}✅ Created simplified backend-only Dockerfile${NC}"
    
    # Update start script
    echo -e "${BLUE}Updating start script...${NC}"
    cat > scripts/start-railway.sh << 'EOF'
#!/bin/sh
set -e

echo "🚀 Starting BISMAN ERP Backend..."
echo "Environment: $NODE_ENV"
echo "Port: $PORT"

# Wait for database to be ready
echo "⏳ Waiting for database connection..."
MAX_RETRIES=10
RETRY_COUNT=0

until npx prisma db execute --stdin <<< "SELECT 1" > /dev/null 2>&1 || [ $RETRY_COUNT -eq $MAX_RETRIES ]; do
  RETRY_COUNT=$((RETRY_COUNT+1))
  echo "Database not ready... attempt $RETRY_COUNT/$MAX_RETRIES"
  sleep 3
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
  echo "❌ Could not connect to database after $MAX_RETRIES attempts"
  exit 1
fi

echo "✅ Database connection established"

# Run database migrations
echo "📦 Running Prisma migrations..."
npx prisma migrate deploy || {
  echo "⚠️  Migration warning (might be already applied or pending)"
}

# Verify database schema
echo "🔍 Verifying database schema..."
npx prisma db execute --stdin <<< "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public'" > /dev/null 2>&1 || {
  echo "⚠️  Warning: Could not verify schema"
}

echo "✅ Database setup complete"

# Start the Node.js server
echo "🎉 Starting Node.js application..."
cd /app
exec node server.js
EOF
    
    chmod +x scripts/start-railway.sh
    echo -e "${GREEN}✅ Updated start script${NC}"
    
    # Commit changes
    echo -e "${BLUE}Committing changes...${NC}"
    git add Dockerfile scripts/start-railway.sh
    git commit -m "fix: simplify Railway deployment to backend-only" || echo "No changes to commit"
    
    echo ""
    echo -e "${GREEN}✅ Dockerfile updated successfully${NC}"
    echo ""
    echo -e "${YELLOW}Next steps:${NC}"
    echo "1. Push to deployment branch: git push origin deployment"
    echo "2. Monitor Railway logs: railway logs --follow"
    echo "3. Check deployment status in Railway dashboard"
    ;;
    
  2)
    echo -e "${BLUE}═══ Diagnosing Railway Deployment ═══${NC}"
    
    # Check Railway connection
    echo -e "${YELLOW}Railway Status:${NC}"
    railway status
    echo ""
    
    # Get recent logs
    echo -e "${YELLOW}Recent Railway Logs (last 50 lines):${NC}"
    railway logs -n 50 || echo "Could not fetch logs"
    echo ""
    
    # Check environment variables
    echo -e "${YELLOW}Environment Variables:${NC}"
    railway variables || echo "Could not fetch variables"
    echo ""
    
    # Check for common issues
    echo -e "${YELLOW}Checking for common issues...${NC}"
    
    # Check if DATABASE_URL is set
    if railway variables | grep -q "DATABASE_URL"; then
        echo -e "${GREEN}✅ DATABASE_URL is set${NC}"
    else
        echo -e "${RED}❌ DATABASE_URL is NOT set${NC}"
    fi
    
    # Check if node version is specified
    if grep -q "node" Dockerfile; then
        echo -e "${GREEN}✅ Node version specified in Dockerfile${NC}"
    else
        echo -e "${YELLOW}⚠️  No Node version in Dockerfile${NC}"
    fi
    
    # Check if start script exists
    if [ -f "scripts/start-railway.sh" ]; then
        echo -e "${GREEN}✅ Start script exists${NC}"
        if [ -x "scripts/start-railway.sh" ]; then
            echo -e "${GREEN}✅ Start script is executable${NC}"
        else
            echo -e "${RED}❌ Start script is NOT executable${NC}"
        fi
    else
        echo -e "${RED}❌ Start script missing${NC}"
    fi
    
    echo ""
    echo -e "${BLUE}Diagnosis complete. Review above for issues.${NC}"
    ;;
    
  3)
    echo -e "${BLUE}═══ Clearing Build Cache ═══${NC}"
    
    echo -e "${YELLOW}This will trigger a fresh rebuild without cache${NC}"
    read -p "Continue? (y/n): " CONFIRM
    
    if [ "$CONFIRM" = "y" ]; then
        echo -e "${BLUE}Triggering rebuild...${NC}"
        railway up --detach || echo "Could not trigger rebuild via CLI"
        
        echo ""
        echo -e "${GREEN}✅ Rebuild triggered${NC}"
        echo -e "${YELLOW}Manual steps in Railway dashboard:${NC}"
        echo "1. Go to your Railway project"
        echo "2. Click on your service"
        echo "3. Go to Deployments tab"
        echo "4. Click 'Redeploy' and check 'Clear Build Cache'"
        echo ""
        echo -e "${YELLOW}Monitor logs with: railway logs --follow${NC}"
    else
        echo "Cancelled"
    fi
    ;;
    
  4)
    echo -e "${BLUE}═══ Advanced: Separate Services Setup ═══${NC}"
    
    echo -e "${YELLOW}This will guide you to create separate backend/frontend services${NC}"
    echo ""
    
    echo -e "${GREEN}Backend Service Setup:${NC}"
    echo "1. In Railway dashboard, create new service"
    echo "2. Link to this repository"
    echo "3. Set Root Directory: my-backend"
    echo "4. Set Start Command: npm start"
    echo "5. Set Environment Variables:"
    echo "   - DATABASE_URL (link from database service)"
    echo "   - ACCESS_TOKEN_SECRET"
    echo "   - REFRESH_TOKEN_SECRET"
    echo "   - NODE_ENV=production"
    echo ""
    
    echo -e "${GREEN}Frontend Service Setup (Optional):${NC}"
    echo "1. Create another new service"
    echo "2. Link to this repository"
    echo "3. Set Root Directory: my-frontend"
    echo "4. Set Start Command: npm start"
    echo "5. Set Environment Variable:"
    echo "   - NEXT_PUBLIC_API_URL=https://your-backend.railway.app/api"
    echo ""
    
    echo -e "${BLUE}Would you like to create backend-only Dockerfile? (y/n)${NC}"
    read -p "> " CREATE_DOCKER
    
    if [ "$CREATE_DOCKER" = "y" ]; then
        # Create backend-specific Dockerfile
        cat > my-backend/Dockerfile << 'EOF'
FROM node:20-alpine

RUN apk add --no-cache postgresql-client openssl libc6-compat dumb-init

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci --only=production && npm cache clean --force

COPY . ./

RUN npx prisma generate

ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

CMD ["dumb-init", "node", "server.js"]
EOF
        
        echo -e "${GREEN}✅ Created my-backend/Dockerfile${NC}"
        echo "Update Railway service to use this Dockerfile"
    fi
    ;;
    
  5)
    echo -e "${BLUE}═══ Running All Fixes ═══${NC}"
    
    # Run option 1
    $0 1
    
    # Wait a bit
    sleep 2
    
    # Run option 2
    echo ""
    echo -e "${BLUE}═══ Now running diagnostics ═══${NC}"
    $0 2
    
    # Ask about cache clear
    echo ""
    echo -e "${YELLOW}Would you like to clear build cache? (y/n)${NC}"
    read -p "> " CLEAR_CACHE
    
    if [ "$CLEAR_CACHE" = "y" ]; then
        $0 3
    fi
    ;;
    
  *)
    echo -e "${RED}Invalid option${NC}"
    exit 1
    ;;
esac

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
echo -e "${GREEN}   Script complete!${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
echo ""
echo -e "${YELLOW}Recommended next steps:${NC}"
echo "1. git push origin deployment"
echo "2. railway logs --follow"
echo "3. Monitor Railway dashboard"
echo ""
echo -e "${BLUE}For more details, see: RAILWAY_DEPLOYMENT_FIX.md${NC}"
