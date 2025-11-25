#!/bin/sh
# Diagnostic startup script for Railway debugging
set -e

echo "========================================="
echo "🔍 Railway Diagnostic Startup"
echo "========================================="

echo "📂 Current directory: $(pwd)"
echo "📂 Directory contents:"
ls -la

echo ""
echo "📂 /app directory contents:"
ls -la /app 2>/dev/null || echo "  /app not found"

echo ""
echo "📂 /app/frontend directory:"
ls -la /app/frontend 2>/dev/null || echo "  /app/frontend not found"

echo ""
echo "📂 /app/frontend/node_modules:"
ls -la /app/frontend/node_modules 2>/dev/null | head -20 || echo "  /app/frontend/node_modules not found"

echo ""
echo "🔍 Checking for Next.js:"
ls -la /app/frontend/node_modules/next 2>/dev/null | head -5 || echo "  Next.js not found!"

echo ""
echo "🔍 Node version:"
node --version

echo ""
echo "🔍 Environment variables:"
echo "  NODE_ENV=$NODE_ENV"
echo "  PORT=$PORT"
echo "  DATABASE_URL=${DATABASE_URL:0:30}..."

echo ""
echo "🎬 Starting actual server..."
exec node index.js
