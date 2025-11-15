#!/bin/bash

# Direct copy plugin to Railway Mattermost container using Railway CLI
# This bypasses HTTP upload timeouts completely

set -e

PLUGIN_FILE="/Users/abhi/Desktop/BISMAN ERP/erp-assistant/dist/com.bisman.erp.assistant-1.0.0+1a376a10.tar.gz"
SERVICE_ID="48542a52-d83d-4503-a25b-9ac1d0d9db7e"

echo "🚀 Deploying ERP Assistant Plugin via Railway CLI..."
echo "📦 Plugin: $(basename "$PLUGIN_FILE")"
echo "📏 Size: $(ls -lh "$PLUGIN_FILE" | awk '{print $5}')"
echo ""

# Step 1: Link to Railway service
echo "🔗 Linking to Railway service..."
cd "/Users/abhi/Desktop/BISMAN ERP/devops/mattermost/railway" || exit 1

# Step 2: Base64 encode the plugin for safe transfer
echo "📦 Encoding plugin file..."
ENCODED=$(base64 -i "$PLUGIN_FILE")
PLUGIN_NAME=$(basename "$PLUGIN_FILE")

# Step 3: Transfer and extract via Railway CLI
echo "⬆️  Uploading to Railway container..."
railway run bash -c "
  mkdir -p /tmp/plugins && \
  echo '$ENCODED' | base64 -d > /tmp/plugins/$PLUGIN_NAME && \
  ls -lh /tmp/plugins/$PLUGIN_NAME && \
  echo 'File uploaded successfully!' && \
  echo 'Installing plugin...' && \
  curl -X POST \
    -H 'Authorization: Bearer 1y54w4qe4fg3djq186tixu34uc' \
    -F 'plugin=@/tmp/plugins/$PLUGIN_NAME' \
    http://localhost:8065/api/v4/plugins && \
  echo 'Plugin installed!'
"

echo ""
echo "✅ Done! Check your Mattermost plugins page."
