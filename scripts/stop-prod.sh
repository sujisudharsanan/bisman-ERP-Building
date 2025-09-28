#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

echo "Stopping and removing pm2 processes for bisman-api and bisman-next"
npx pm2 delete bisman-api bisman-next || true
npx pm2 save || true

echo "Done. To fully remove pm2 (global), run: npm uninstall -g pm2"
