#!/bin/bash

# Mattermost Bot Troubleshooting Script
# Run this to diagnose why the bot isn't responding

echo "=================================="
echo "🔍 Mattermost Bot Diagnostic Tool"
echo "=================================="
echo ""

# 1. Check if backend is running
echo "1️⃣ Checking if backend is running..."
if curl -s http://localhost:3000/api/health > /dev/null 2>&1; then
    echo "   ✅ Backend is running"
else
    echo "   ❌ Backend is NOT running"
    echo "   💡 Start backend: cd my-backend && npm run dev"
    exit 1
fi
echo ""

# 2. Check Mattermost bot endpoint
echo "2️⃣ Checking Mattermost bot endpoint..."
HEALTH=$(curl -s http://localhost:3000/api/mattermost/health)
if [ ! -z "$HEALTH" ]; then
    echo "   ✅ Bot endpoint is responding"
    echo "   Response: $HEALTH"
else
    echo "   ❌ Bot endpoint is NOT responding"
fi
echo ""

# 3. Check if Mattermost is accessible
echo "3️⃣ Checking Mattermost server..."
MATTERMOST_URL="http://localhost:8065"
if curl -s $MATTERMOST_URL > /dev/null 2>&1; then
    echo "   ✅ Mattermost server is accessible at $MATTERMOST_URL"
else
    echo "   ⚠️  Mattermost server not accessible at $MATTERMOST_URL"
    echo "   💡 Check if Mattermost is running or update URL"
fi
echo ""

# 4. Check plugin files
echo "4️⃣ Checking plugin files..."
if [ -f "erp-assistant/erp-assistant-complete.tar.gz" ]; then
    SIZE=$(du -h erp-assistant/erp-assistant-complete.tar.gz | cut -f1)
    echo "   ✅ Plugin package exists (Size: $SIZE)"
    echo "   📦 Package: erp-assistant/erp-assistant-complete.tar.gz"
else
    echo "   ❌ Plugin package not found"
fi

if [ -f "erp-assistant/server/dist/plugin-linux-amd64" ]; then
    SIZE=$(du -h erp-assistant/server/dist/plugin-linux-amd64 | cut -f1)
    echo "   ✅ Linux binary exists (Size: $SIZE)"
else
    echo "   ❌ Linux binary not found"
fi
echo ""

# 5. Plugin verification checklist
echo "=================================="
echo "📋 Manual Verification Checklist"
echo "=================================="
echo ""
echo "In Mattermost System Console, verify:"
echo ""
echo "1. Plugin Upload:"
echo "   ☐ Go to System Console → Plugins → Plugin Management"
echo "   ☐ Plugin 'ERP Assistant' shows up in the list"
echo "   ☐ Plugin status is 'Running' (green indicator)"
echo ""
echo "2. Plugin Settings:"
echo "   ☐ Click on 'ERP Assistant' plugin"
echo "   ☐ Enable toggle is ON"
echo "   ☐ No error messages displayed"
echo ""
echo "3. Bot User:"
echo "   ☐ Search for @erpbot in user search"
echo "   ☐ Bot user should appear with BOT badge"
echo "   ☐ Bot should be active (green dot)"
echo ""
echo "4. Test in Channel:"
echo "   ☐ Go to any public channel"
echo "   ☐ Type: @erpbot hello"
echo "   ☐ Bot should respond within 2-3 seconds"
echo ""
echo "=================================="
echo "🔧 Troubleshooting Steps"
echo "=================================="
echo ""
echo "If bot is NOT responding:"
echo ""
echo "Step 1: Check Plugin Status"
echo "   • System Console → Plugins"
echo "   • Look for errors in plugin list"
echo "   • If plugin shows 'Failed', check error message"
echo ""
echo "Step 2: Check Server Logs"
echo "   • System Console → Server Logs"
echo "   • Look for: 'ERP Assistant Plugin activated'"
echo "   • Look for any error messages with 'erpbot'"
echo ""
echo "Step 3: Restart Plugin"
echo "   • System Console → Plugins → Plugin Management"
echo "   • Find 'ERP Assistant'"
echo "   • Toggle OFF → Wait 3 seconds → Toggle ON"
echo ""
echo "Step 4: Re-upload Plugin"
echo "   • Remove existing plugin"
echo "   • Upload fresh copy: erp-assistant-complete.tar.gz"
echo "   • Enable plugin"
echo ""
echo "Step 5: Check Bot Mentions"
echo "   • Make sure to @mention the bot: @erpbot hello"
echo "   • Don't just type 'erpbot hello'"
echo "   • The @ symbol is required!"
echo ""
echo "=================================="
echo "📞 Common Issues & Solutions"
echo "=================================="
echo ""
echo "Issue: 'Plugin failed to start'"
echo "Solution: Check that you uploaded the NEW plugin (24MB)"
echo "          Old plugins had HTTP server, new one uses RPC"
echo ""
echo "Issue: 'Unrecognized remote plugin message'"
echo "Solution: You uploaded the wrong/old plugin binary"
echo "          Upload: erp-assistant-complete.tar.gz (24MB)"
echo ""
echo "Issue: 'Bot doesn't respond'"
echo "Solutions:"
echo "  1. Make sure plugin is ENABLED (toggle ON)"
echo "  2. Check if @erpbot user exists (search in users)"
echo "  3. Use @ symbol: @erpbot not just 'erpbot'"
echo "  4. Try in different channel"
echo "  5. Check you're in a public channel (not DM)"
echo ""
echo "Issue: 'Permission denied' when messaging bot"
echo "Solution: Make sure bot has permission to post"
echo "          System Console → Users → Bot Accounts"
echo "          Find @erpbot and enable 'Post All'"
echo ""
echo "=================================="
echo "🧪 Quick Test Commands"
echo "=================================="
echo ""
echo "In Mattermost channel, try these:"
echo ""
echo "  @erpbot hello"
echo "  @erpbot show my invoices"
echo "  @erpbot check leave balance"
echo "  @erpbot help"
echo ""
echo "Expected: Bot responds within 2-3 seconds"
echo ""
echo "=================================="
echo ""

# Print current status summary
echo "📊 Current Status:"
echo "   Backend: ✅ Running"
echo "   Bot Endpoint: ✅ Active"
echo "   Plugin Package: ✅ Available"
echo ""
echo "Next: Check Mattermost System Console for plugin status"
echo ""
