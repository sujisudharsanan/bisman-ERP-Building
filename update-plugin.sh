#!/bin/bash

# Update ERP Assistant Plugin with Better Logging

set -e

PLUGIN_FILE="/Users/abhi/Desktop/BISMAN ERP/erp-assistant/dist/com.bisman.erp.assistant-1.0.0+1a376a10.tar.gz"
MM_URL="https://mattermost-production-84fd.up.railway.app"
ADMIN_TOKEN="1y54w4qe4fg3djq186tixu34uc"
PLUGIN_ID="com.bisman.erp.assistant"

echo "🔄 Updating ERP Assistant Plugin..."
echo ""

# Step 1: Disable plugin
echo "1️⃣  Disabling old plugin..."
curl -s -X POST \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  "$MM_URL/api/v4/plugins/$PLUGIN_ID/disable" | jq '.'

sleep 2

# Step 2: Remove old plugin
echo ""
echo "2️⃣  Removing old plugin..."
curl -s -X DELETE \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  "$MM_URL/api/v4/plugins/$PLUGIN_ID" | jq '.'

sleep 2

# Step 3: Upload new plugin
echo ""
echo "3️⃣  Uploading new plugin (with better logging)..."
echo "⏳  This may take 5-10 minutes..."

RESPONSE=$(curl -X POST \
  --max-time 600 \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -F "plugin=@$PLUGIN_FILE" \
  "$MM_URL/api/v4/plugins" \
  2>&1)

echo "$RESPONSE" | jq '.'

# Step 4: Enable plugin
if echo "$RESPONSE" | grep -q '"id"'; then
  echo ""
  echo "4️⃣  Enabling new plugin..."
  curl -s -X POST \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    "$MM_URL/api/v4/plugins/$PLUGIN_ID/enable" | jq '.'
  
  echo ""
  echo "✅ Plugin updated successfully!"
  echo ""
  echo "📝 Now test in Mattermost:"
  echo "   - Send a message to @erpbot"
  echo "   - Check logs in System Console → Logs"
else
  echo ""
  echo "❌ Upload failed"
fi
