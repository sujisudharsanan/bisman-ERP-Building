#!/usr/bin/env bash
# Helper: start the NestJS API with NODE_ENV=development so dev cookies are not Secure
set -euo pipefail

export NODE_ENV=development
echo "Starting API in development (NODE_ENV=$NODE_ENV)"
echo "Running: npm run dev:backend"
cd "$(dirname "$0")"
npm run dev:backend
