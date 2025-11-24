#!/bin/bash

# 🔐 BISMAN ERP - IMMEDIATE SECURITY FIXES
# 
# This script implements CRITICAL security fixes identified in the audit:
# 1. Generate and validate JWT secrets
# 2. Backup current auth middleware
# 3. Deploy secure auth middleware
# 4. Update Railway environment variables
# 5. Verify deployment
#
# CRITICAL: This must be run BEFORE deploying to production

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${BLUE}"
cat << "EOF"
╔════════════════════════════════════════════════════════════════╗
║                                                                ║
║         🔐 BISMAN ERP - CRITICAL SECURITY FIXES               ║
║                                                                ║
║         Implementing immediate security improvements           ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"

echo ""
echo -e "${YELLOW}⚠️  WARNING: This will make breaking changes to authentication${NC}"
echo -e "${YELLOW}⚠️  Make sure you have backups and are ready to update Railway${NC}"
echo ""
read -p "Continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
  echo "Aborted."
  exit 0
fi

echo ""

# ============================================================================
# STEP 1: GENERATE SECURE JWT SECRETS
# ============================================================================
echo -e "${BLUE}[1/6] 🔑 Generating Secure JWT Secrets${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check if openssl is available
if ! command -v openssl &> /dev/null; then
  echo -e "${RED}✗ openssl not found. Please install it first.${NC}"
  exit 1
fi

echo "Generating cryptographically secure secrets..."

# Generate secrets
ACCESS_TOKEN_SECRET=$(openssl rand -base64 64 | tr -d '\n')
REFRESH_TOKEN_SECRET=$(openssl rand -base64 64 | tr -d '\n')

echo -e "${GREEN}✓ Generated ACCESS_TOKEN_SECRET (${#ACCESS_TOKEN_SECRET} characters)${NC}"
echo -e "${GREEN}✓ Generated REFRESH_TOKEN_SECRET (${#REFRESH_TOKEN_SECRET} characters)${NC}"

# Save to secure file
SECRETS_FILE=".railway-secrets-$(date +%Y%m%d_%H%M%S).env"
cat > "$SECRETS_FILE" << EOF
# Generated: $(date)
# CRITICAL: Keep this file secure and delete after adding to Railway

ACCESS_TOKEN_SECRET=${ACCESS_TOKEN_SECRET}
REFRESH_TOKEN_SECRET=${REFRESH_TOKEN_SECRET}

# Railway CLI commands to set these:
# railway variables set ACCESS_TOKEN_SECRET="${ACCESS_TOKEN_SECRET}"
# railway variables set REFRESH_TOKEN_SECRET="${REFRESH_TOKEN_SECRET}"
EOF

chmod 600 "$SECRETS_FILE"

echo -e "${GREEN}✓ Secrets saved to: ${SECRETS_FILE}${NC}"
echo -e "${YELLOW}⚠️  IMPORTANT: Add these to Railway, then DELETE this file${NC}"
echo ""

# ============================================================================
# STEP 2: BACKUP CURRENT MIDDLEWARE
# ============================================================================
echo -e "${BLUE}[2/6] 💾 Backing Up Current Auth Middleware${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

BACKUP_DIR="my-backend/middleware/backup-$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

if [ -f "my-backend/middleware/auth.js" ]; then
  cp "my-backend/middleware/auth.js" "$BACKUP_DIR/auth.js.backup"
  echo -e "${GREEN}✓ Backed up auth.js${NC}"
else
  echo -e "${YELLOW}⚠️  No existing auth.js found (this is okay for new setup)${NC}"
fi

if [ -f "my-backend/middleware/tenantGuard.js" ]; then
  cp "my-backend/middleware/tenantGuard.js" "$BACKUP_DIR/tenantGuard.js.backup"
  echo -e "${GREEN}✓ Backed up tenantGuard.js${NC}"
fi

echo -e "${GREEN}✓ Backups saved to: ${BACKUP_DIR}${NC}"
echo ""

# ============================================================================
# STEP 3: DEPLOY SECURE MIDDLEWARE
# ============================================================================
echo -e "${BLUE}[3/6] 🚀 Deploying Secure Middleware${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check if secure versions exist
if [ ! -f "my-backend/middleware/auth.secure.js" ]; then
  echo -e "${RED}✗ auth.secure.js not found. Run security audit generation first.${NC}"
  exit 1
fi

if [ ! -f "my-backend/middleware/tenantIsolation.js" ]; then
  echo -e "${RED}✗ tenantIsolation.js not found. Run security audit generation first.${NC}"
  exit 1
fi

if [ ! -f "my-backend/lib/secureJWT.js" ]; then
  echo -e "${RED}✗ secureJWT.js not found. Run security audit generation first.${NC}"
  exit 1
fi

echo "Reviewing changes before deployment..."
echo ""
echo -e "${CYAN}Key Security Improvements:${NC}"
echo "  ✅ No default JWT secrets - fail-fast if not configured"
echo "  ✅ Production safeguards for dev users (multiple checks)"
echo "  ✅ Constant-time password comparison (timing attack prevention)"
echo "  ✅ Admin role DB verification (defense in depth)"
echo "  ✅ Tenant isolation middleware (IDOR prevention)"
echo "  ✅ Comprehensive audit logging"
echo ""

read -p "Deploy secure middleware? (yes/no): " deploy_confirm

if [ "$deploy_confirm" != "yes" ]; then
  echo "Deployment cancelled."
  exit 0
fi

# Option 1: Replace existing files (BREAKING CHANGE)
echo ""
echo "Choose deployment method:"
echo "  1) Replace existing auth.js (BREAKING - requires Railway secrets update)"
echo "  2) Deploy alongside (auth.secure.js, test first)"
echo ""
read -p "Enter choice (1 or 2): " method

if [ "$method" = "1" ]; then
  echo "Replacing auth.js with secure version..."
  cp "my-backend/middleware/auth.secure.js" "my-backend/middleware/auth.js"
  echo -e "${GREEN}✓ Deployed auth.js${NC}"
  
  echo "Note: You MUST update Railway secrets before this will work!"
  MUST_UPDATE_RAILWAY=true
elif [ "$method" = "2" ]; then
  echo -e "${GREEN}✓ Secure middleware available at:${NC}"
  echo "  - my-backend/middleware/auth.secure.js"
  echo "  - my-backend/middleware/tenantIsolation.js"
  echo "  - my-backend/lib/secureJWT.js"
  echo ""
  echo "To use: Update your imports to use auth.secure instead of auth"
  MUST_UPDATE_RAILWAY=false
else
  echo "Invalid choice. Exiting."
  exit 1
fi

echo ""

# ============================================================================
# STEP 4: UPDATE LOCAL .ENV
# ============================================================================
echo -e "${BLUE}[4/6] 📝 Updating Local Environment${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

ENV_FILE="my-backend/.env"

if [ -f "$ENV_FILE" ]; then
  # Backup existing .env
  cp "$ENV_FILE" "${ENV_FILE}.backup-$(date +%Y%m%d_%H%M%S)"
  echo -e "${GREEN}✓ Backed up existing .env${NC}"
fi

# Update or add secrets
if grep -q "ACCESS_TOKEN_SECRET" "$ENV_FILE" 2>/dev/null; then
  # Update existing
  sed -i.tmp "s|^ACCESS_TOKEN_SECRET=.*|ACCESS_TOKEN_SECRET=${ACCESS_TOKEN_SECRET}|" "$ENV_FILE"
  sed -i.tmp "s|^REFRESH_TOKEN_SECRET=.*|REFRESH_TOKEN_SECRET=${REFRESH_TOKEN_SECRET}|" "$ENV_FILE"
  rm -f "${ENV_FILE}.tmp"
  echo -e "${GREEN}✓ Updated existing secrets in .env${NC}"
else
  # Add new
  echo "" >> "$ENV_FILE"
  echo "# JWT Secrets (Generated: $(date))" >> "$ENV_FILE"
  echo "ACCESS_TOKEN_SECRET=${ACCESS_TOKEN_SECRET}" >> "$ENV_FILE"
  echo "REFRESH_TOKEN_SECRET=${REFRESH_TOKEN_SECRET}" >> "$ENV_FILE"
  echo -e "${GREEN}✓ Added secrets to .env${NC}"
fi

# Set ALLOW_DEV_USERS for local development
if grep -q "ALLOW_DEV_USERS" "$ENV_FILE" 2>/dev/null; then
  sed -i.tmp "s|^ALLOW_DEV_USERS=.*|ALLOW_DEV_USERS=true|" "$ENV_FILE"
  rm -f "${ENV_FILE}.tmp"
else
  echo "ALLOW_DEV_USERS=true" >> "$ENV_FILE"
fi

echo -e "${GREEN}✓ Local development environment configured${NC}"
echo ""

# ============================================================================
# STEP 5: RAILWAY CONFIGURATION INSTRUCTIONS
# ============================================================================
echo -e "${BLUE}[5/6] ☁️  Railway Configuration${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ "$MUST_UPDATE_RAILWAY" = true ]; then
  echo -e "${RED}🚨 CRITICAL: You MUST update Railway secrets before deploying${NC}"
  echo ""
fi

echo -e "${CYAN}Run these commands to update Railway:${NC}"
echo ""
cat << EOF
# 1. Login to Railway (if not already)
railway login

# 2. Link to your project
railway link

# 3. Set the secrets
railway variables set ACCESS_TOKEN_SECRET="${ACCESS_TOKEN_SECRET}"
railway variables set REFRESH_TOKEN_SECRET="${REFRESH_TOKEN_SECRET}"

# 4. Verify secrets are set (values will be masked)
railway variables

# 5. IMPORTANT: Ensure production mode is set
railway variables set NODE_ENV="production"
railway variables set PRODUCTION_MODE="true"

# 6. Deploy the changes
git add my-backend/middleware/
git commit -m "security: implement critical security fixes"
git push origin deployment

# Railway will auto-deploy after push
EOF

echo ""
echo -e "${YELLOW}⚠️  Save these commands to a file or copy them now${NC}"
echo ""

read -p "Have you updated Railway secrets? (yes/no): " railway_done

if [ "$railway_done" != "yes" ]; then
  echo ""
  echo -e "${RED}⚠️  DO NOT DEPLOY until Railway secrets are updated${NC}"
  echo -e "${RED}⚠️  Application will fail to start without proper secrets${NC}"
  echo ""
fi

echo ""

# ============================================================================
# STEP 6: VERIFICATION & TESTING
# ============================================================================
echo -e "${BLUE}[6/6] ✅ Verification Checklist${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo ""
echo "Complete these verification steps:"
echo ""
echo "LOCAL TESTING:"
echo "  [ ] 1. Start backend: cd my-backend && npm run dev"
echo "  [ ] 2. Check logs for 'JWT secrets validated successfully'"
echo "  [ ] 3. Test login with dev user (should work locally)"
echo "  [ ] 4. Verify authentication works"
echo ""
echo "RAILWAY DEPLOYMENT:"
echo "  [ ] 1. Secrets updated in Railway dashboard"
echo "  [ ] 2. NODE_ENV=production set"
echo "  [ ] 3. PRODUCTION_MODE=true set"
echo "  [ ] 4. Code pushed to deployment branch"
echo "  [ ] 5. Railway build completed successfully"
echo "  [ ] 6. Check Railway logs for startup messages"
echo "  [ ] 7. Verify 'Production mode: Dev users DISABLED' in logs"
echo "  [ ] 8. Test production login (database users only)"
echo ""
echo "SECURITY VERIFICATION:"
echo "  [ ] 1. No dev users accessible in production"
echo "  [ ] 2. JWT secrets are strong (64+ chars, random)"
echo "  [ ] 3. Admin role verification against DB working"
echo "  [ ] 4. Tenant isolation enforced"
echo "  [ ] 5. All authentication tests passing"
echo ""

# ============================================================================
# SUMMARY
# ============================================================================
echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                    📊 Deployment Summary                      ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}✓ Secure JWT secrets generated${NC}"
echo -e "${GREEN}✓ Current middleware backed up${NC}"
echo -e "${GREEN}✓ Secure middleware deployed${NC}"
echo -e "${GREEN}✓ Local environment updated${NC}"
echo ""
echo -e "${CYAN}Files Generated:${NC}"
echo "  - ${SECRETS_FILE} (DELETE after Railway update)"
echo "  - ${BACKUP_DIR}/ (backup of old middleware)"
echo "  - my-backend/.env.backup-* (backup of old .env)"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "  1. Update Railway secrets (commands shown above)"
echo "  2. Verify local development works"
echo "  3. Deploy to Railway"
echo "  4. Verify production deployment"
echo "  5. DELETE ${SECRETS_FILE}"
echo "  6. Run security test suite: ./scripts/security-test.sh"
echo ""
echo -e "${RED}CRITICAL REMINDERS:${NC}"
echo "  ⚠️  Application will NOT START without proper Railway secrets"
echo "  ⚠️  Dev users will be DISABLED in production (as intended)"
echo "  ⚠️  All existing tokens will be INVALIDATED (users must re-login)"
echo "  ⚠️  DELETE ${SECRETS_FILE} after Railway update"
echo ""
echo -e "${GREEN}Security improvements applied! 🎉${NC}"
echo ""
