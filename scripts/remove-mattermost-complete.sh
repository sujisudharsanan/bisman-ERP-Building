#!/bin/bash

echo "🗑️  Removing Mattermost Integration Completely"
echo "=============================================="
echo ""

# Navigate to project root
cd "/Users/abhi/Desktop/BISMAN ERP"

# 1. Remove Mattermost API routes
echo "📂 Removing Mattermost API routes..."
rm -rf my-frontend/src/app/api/mattermost/
echo "   ✅ Deleted: my-frontend/src/app/api/mattermost/"

# 2. Remove Mattermost client library
echo "📂 Removing Mattermost client library..."
rm -f my-frontend/src/lib/mattermostClient.ts
echo "   ✅ Deleted: my-frontend/src/lib/mattermostClient.ts"

# 3. Remove Mattermost documentation
echo "📂 Removing Mattermost documentation..."
rm -rf docs/archive/mattermost/
echo "   ✅ Deleted: docs/archive/mattermost/"

# 4. Remove Mattermost backend routes (if any)
echo "📂 Checking for backend Mattermost routes..."
if [ -f "my-backend/routes/mattermost.js" ]; then
    rm -f my-backend/routes/mattermost.js
    echo "   ✅ Deleted: my-backend/routes/mattermost.js"
fi

# 5. Remove Mattermost bot integration files
echo "📂 Checking for Mattermost bot files..."
if [ -d "my-backend/mattermostBot" ]; then
    rm -rf my-backend/mattermostBot
    echo "   ✅ Deleted: my-backend/mattermostBot/"
fi

# 6. Remove erp-assistant plugin
echo "📂 Removing ERP Assistant plugin..."
if [ -d "erp-assistant" ]; then
    rm -rf erp-assistant
    echo "   ✅ Deleted: erp-assistant/"
fi

# 7. Remove Mattermost markdown files
echo "📂 Removing Mattermost markdown files..."
rm -f UPLOAD_PLUGIN_NOW.md
rm -f BOT_IS_WORKING.md
rm -f CHATBOT_DEPLOYMENT_GUIDE.md
echo "   ✅ Deleted Mattermost docs"

# 8. List remaining files with mattermost references
echo ""
echo "🔍 Checking for remaining Mattermost references..."
echo ""

# Search for remaining references (case insensitive)
if grep -r -i "mattermost\|MM_URL\|MM_BOT" --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=.next --exclude="*.log" --exclude="remove-mattermost.sh" . 2>/dev/null | head -20; then
    echo ""
    echo "⚠️  Found remaining references above - may need manual cleanup"
else
    echo "✅ No remaining Mattermost references found!"
fi

echo ""
echo "================================================"
echo "✅ Mattermost removal complete!"
echo ""
echo "📝 Summary:"
echo "   - Removed API routes: my-frontend/src/app/api/mattermost/"
echo "   - Removed client lib: my-frontend/src/lib/mattermostClient.ts"
echo "   - Removed documentation"
echo "   - Removed bot integration files"
echo ""
echo "🔄 Next steps:"
echo "   1. git add -A"
echo "   2. git commit -m 'Remove Mattermost integration completely'"
echo "   3. git push origin deployment"
echo ""
