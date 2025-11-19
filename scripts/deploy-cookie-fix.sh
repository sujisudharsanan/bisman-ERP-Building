#!/bin/bash
# Quick Deploy Script - Fix Cookie Issues

echo "🔧 Deploying Cookie Fixes to Production..."
echo ""

# Check if we're on the right branch
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "diployment" ]; then
    echo "⚠️  Warning: You're on branch '$CURRENT_BRANCH', not 'diployment'"
    read -p "Continue anyway? (y/n): " CONTINUE
    if [ "$CONTINUE" != "y" ]; then
        echo "Aborted."
        exit 1
    fi
fi

echo "📋 Changes Summary:"
echo "  1. ✅ Fixed cookie secure=true in production (backend)"
echo "  2. ✅ Set domain='localhost' for development (backend)"
echo "  3. ✅ Updated API_BASE to always use direct URL (frontend)"
echo "  4. ✅ Added cookie debug logging (backend)"
echo ""

# Show changes
echo "📝 Git Status:"
git status --short
echo ""

read -p "Commit and push these changes? (y/n): " CONFIRM
if [ "$CONFIRM" != "y" ]; then
    echo "Aborted. No changes committed."
    exit 0
fi

# Commit changes
echo ""
echo "📦 Committing changes..."
git add my-backend/app.js my-frontend/src/config/api.ts my-frontend/.env.production COOKIE_FIX_DEPLOYMENT.md
git commit -m "Fix: Cookie authentication for cross-origin deployment

- Force secure=true for production cookies (required for SameSite=None)
- Use direct backend URL instead of rewrites for cookie support
- Set domain='localhost' for development cross-port cookies
- Add debug logging for cookie settings

Fixes: Cookie authentication between Vercel (frontend) and Render (backend)
Closes: Cookie token not found errors in production"

echo ""
echo "🚀 Pushing to remote..."
git push origin "$CURRENT_BRANCH"

echo ""
echo "✅ Deployment initiated!"
echo ""
echo "📊 Next Steps:"
echo "  1. Wait for Render backend to redeploy (~2-3 minutes)"
echo "  2. Wait for Vercel frontend to redeploy (~1-2 minutes)"
echo "  3. Monitor Render logs: https://dashboard.render.com"
echo "  4. Test login at: https://bisman-erp-building-git-diployment-sujis-projects-dfb64252.vercel.app"
echo ""
echo "🧪 Testing Checklist:"
echo "  □ Clear browser cookies"
echo "  □ Navigate to login page"
echo "  □ Login with test credentials"
echo "  □ Check DevTools → Application → Cookies"
echo "  □ Verify cookies have: Secure=Yes, SameSite=None"
echo "  □ Check dashboard loads successfully"
echo "  □ Verify Render logs show cookie settings"
echo ""
echo "📖 See COOKIE_FIX_DEPLOYMENT.md for detailed troubleshooting"
