#!/bin/bash
# Deployment script for production security fix

echo "� Deploying Production Security Fix..."
echo ""
echo "⚠️  IMPORTANT: This deployment disables devUsers in production!"
echo "   - demo_hub_incharge@bisman.demo will NOT work in production"
echo "   - Only real database users can login"
echo "   - Database connection is REQUIRED"
echo ""
read -p "Do you want to continue? (y/n): " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]
then
    echo "Deployment cancelled."
    exit 1
fi

# Navigate to project directory
cd "/Users/abhi/Desktop/BISMAN ERP"

# Stage the changes
echo "📦 Staging changes..."
git add my-backend/app.js
git add my-backend/middleware/auth.js
git add PRODUCTION_SECURITY_FIX.md
git add PRODUCTION_LOGIN_FIX.md
git add LOGIN_DB_FALLBACK_FIX.md
git add LOGIN_FIX_QUICK_REF.md
git add PRODUCTION_LOGIN_SUMMARY.md
git add DEPLOY_NOW.sh

# Commit
echo "💾 Committing changes..."
git commit -m "security: Disable devUsers fallback in production mode

SECURITY IMPROVEMENTS:
- Disable devUsers login in production (NODE_ENV=production)
- Require database authentication in production
- Return 503 if database fails (no fallback to devUsers)
- Return 401 for invalid credentials (no devUser backdoor)
- Add ALLOW_DEV_USERS override for testing (use carefully!)

BREAKING CHANGES:
- demo_hub_incharge@bisman.demo will NOT work in production
- demo_admin@bisman.demo will NOT work in production
- All demo/*.demo emails disabled in production
- Database connection is REQUIRED for production login

DEVELOPMENT MODE (unchanged):
- devUsers still work in development
- Fallback behavior preserved for local testing
- No impact on local development workflow

MIGRATION REQUIRED:
- Create real users in database before deploying
- Set DATABASE_URL in production environment
- Verify NODE_ENV=production is set

Environment Variables Required:
- NODE_ENV=production (required)
- DATABASE_URL=postgresql://... (required)
- ACCESS_TOKEN_SECRET (required)
- REFRESH_TOKEN_SECRET (required)

Optional Override (testing only):
- ALLOW_DEV_USERS=true (⚠️ security risk, use temporarily)

Resolves: Production security requirement
Impact: High - Required for secure production deployment"

# Push to Railway
echo "🚂 Pushing to Railway..."
git push origin under-development

echo ""
echo "✅ Deployment initiated!"
echo ""
echo "⚠️  CRITICAL - Before users can login:"
echo "1. Verify NODE_ENV=production is set in Railway"
echo "2. Verify DATABASE_URL is set and valid"
echo "3. Create at least one admin user in database"
echo "4. Test login with real database user"
echo ""
echo "📋 To create first admin user (choose one method):"
echo ""
echo "Method 1 - Direct Database:"
echo "  psql \$DATABASE_URL"
echo "  INSERT INTO users (email, password, role) VALUES"
echo "  ('admin@company.com', '\$2a\$10\$...bcrypt_hash...', 'ADMIN');"
echo ""
echo "Method 2 - Temporary Override (testing only):"
echo "  1. Set ALLOW_DEV_USERS=true in Railway"
echo "  2. Login with demo_hub_incharge@bisman.demo"
echo "  3. Create admin user via UI"
echo "  4. Remove ALLOW_DEV_USERS from Railway"
echo ""
echo "🔍 Verify deployment:"
echo "  curl -X POST https://your-api.railway.app/api/login \\"
echo "    -H 'Content-Type: application/json' \\"
echo "    -d '{\"email\":\"demo_hub_incharge@bisman.demo\",\"password\":\"changeme\"}'"
echo ""
echo "  Expected: 401 Unauthorized (devUsers disabled) ✅"
echo ""
echo "⏳ Deployment will complete in 2-3 minutes"
echo ""
