#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

echo "Installing pm2-logrotate module and configuring sensible defaults"
if ! npx pm2 module:install pm2-logrotate >/dev/null 2>&1; then
  echo "pm2-logrotate install failed; attempting via npm"
  npm install pm2-logrotate --no-audit --no-fund || true
  npx pm2 module:install pm2-logrotate || true
fi

echo "Configuring logrotate: max_size=10M, retain=14 days, compress=true"
npx pm2 set pm2-logrotate:max_size 10M || true
npx pm2 set pm2-logrotate:compress true || true
npx pm2 set pm2-logrotate:retain 14 || true
npx pm2 set pm2-logrotate:rotateInterval '0 0 * * *' || true

echo "Reloading pm2 to apply module settings"
npx pm2 reload all || true

echo "pm2 log rotation configured."
