#!/usr/bin/env bash
set -euo pipefail

# Build server binaries (darwin and linux amd64) and webapp bundle (if present) and package plugin.zip
PLUGIN_ROOT=$(dirname "$0")
cd "$PLUGIN_ROOT"

echo "[1/5] Cleaning old dist"
rm -rf server/dist webapp/dist plugin.zip temp-bundle || true
mkdir -p server/dist

echo "[2/5] Building server binaries"
( cd server && GOOS=linux GOARCH=amd64 go build -o dist/plugin-linux-amd64 )
( cd server && GOOS=darwin GOARCH=amd64 go build -o dist/plugin-darwin-amd64 )

echo "[3/5] Building webapp (if any)"
if [ -d webapp ]; then
  if [ -f webapp/package.json ]; then
    ( cd webapp && npm install --no-audit --no-fund --legacy-peer-deps && npm run build || echo 'webapp build skipped or failed; continuing with server-only plugin' )
  fi
fi

echo "[4/5] Preparing bundle"
mkdir -p temp-bundle
cp plugin.json temp-bundle/
cp -R server/dist temp-bundle/server
if [ -d webapp/dist ]; then
  mkdir -p temp-bundle/webapp/dist
  cp webapp/dist/* temp-bundle/webapp/dist/ || true
fi

# Optional assets
if [ -d assets ]; then
  cp -R assets temp-bundle/assets
fi

echo "[5/5] Creating plugin.zip and plugin.tar.gz"
(cd temp-bundle && zip -r ../plugin.zip . >/dev/null)
# Create tar.gz expected by older Mattermost versions
(cd temp-bundle && tar -czf ../plugin.tar.gz .)

# Cleanup temp staging (keep server/dist for incremental uploads)
rm -rf temp-bundle

echo "Done. Artifacts: $(pwd)/plugin.zip and $(pwd)/plugin.tar.gz"
