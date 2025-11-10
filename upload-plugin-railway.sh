#!/bin/bash

# Upload ERP Assistant Plugin to Railway Mattermost
# This script uploads the plugin via Mattermost API with chunked upload

PLUGIN_FILE="/Users/abhi/Desktop/BISMAN ERP/erp-assistant/dist/com.bisman.erp.assistant-1.0.0+1a376a10.tar.gz"
MM_URL="https://mattermost-production-84fd.up.railway.app"
ADMIN_TOKEN="1y54w4qe4fg3djq186tixu34uc"

echo "🚀 Uploading ERP Assistant Plugin to Railway Mattermost..."
echo "📦 Plugin: $(basename "$PLUGIN_FILE")"
echo "📏 Size: $(ls -lh "$PLUGIN_FILE" | awk '{print $5}')"
echo ""

# Upload with 10 minute timeout
echo "⏳ Starting upload (this may take several minutes)..."
RESPONSE=$(curl -X POST \
  --max-time 600 \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -F "plugin=@$PLUGIN_FILE" \
  "$MM_URL/api/v4/plugins" \
  2>&1)

echo ""
echo "📝 Response:"
echo "$RESPONSE"

# Check if upload succeeded
if echo "$RESPONSE" | grep -q '"id"'; then
  echo ""
  echo "✅ Plugin uploaded successfully!"
  echo "🔧 Next steps:"
  echo "   1. Go to $MM_URL/admin_console/plugins/plugin_management"
  echo "   2. Find 'ERP Assistant' and click 'Enable'"
  echo "   3. Test by sending: @erpbot help"
else
  echo ""
  echo "❌ Upload failed. See response above."
  echo ""
  echo "🔄 Alternative: Try smaller timeout or Railway CLI method"
fi
