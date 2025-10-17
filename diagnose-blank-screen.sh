#!/bin/bash
# Quick diagnostic and fix for blank screen issue

echo "🔍 Checking for common blank screen issues..."
echo ""

# Check if frontend is running
if curl -sS http://localhost:3000 > /dev/null 2>&1; then
  echo "✅ Frontend is responding"
else
  echo "❌ Frontend is not running"
  exit 1
fi

# Check if CSS is loading
if curl -sS http://localhost:3000/_next/static/css/app/layout.css > /dev/null 2>&1; then
  echo "✅ CSS is loading"
else
  echo "⚠️  CSS might not be loading properly"
fi

# Check for build errors
if [ -d "my-frontend/.next" ]; then
  echo "✅ Next.js build folder exists"
else
  echo "⚠️  No .next build folder - might need to rebuild"
fi

echo ""
echo "💡 Suggested fixes:"
echo ""
echo "1. Clear browser cache and hard refresh (Cmd+Shift+R)"
echo "2. Check browser console for errors"
echo "3. Try disabling dark mode in browser DevTools"
echo "4. Rebuild frontend:"
echo "   cd my-frontend && rm -rf .next && npm run dev"
echo ""
echo "5. Try accessing in Incognito/Private mode"
echo ""
