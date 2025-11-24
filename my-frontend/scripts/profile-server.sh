#!/usr/bin/env bash
set -euo pipefail

export NODE_OPTIONS="--inspect=0.0.0.0:9229"
export NEXT_TELEMETRY_DISABLED=1

echo "[profile] Starting Next.js with inspector on 9229"

npm run dev
