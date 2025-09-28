#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

echo "Ensure pm2 is installed and saved for startup"
if ! command -v pm2 >/dev/null 2>&1; then
  echo "pm2 not found globally; installing locally via npm (this may take a moment)"
  npm install pm2 --no-audit --no-fund
  npx pm2 -v
fi

echo "Saving current pm2 process list and generating startup script"
npx pm2 save || true

# generate startup script for systemd (most linux). On macOS this will print an instruction
echo "Run the following command as root (if on Linux) to configure pm2 to start on boot:"
npx pm2 startup || true

echo "If prompted, run the printed command. After that, run: npx pm2 save"

echo "pm2 setup helper complete."
