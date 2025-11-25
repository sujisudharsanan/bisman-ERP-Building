#!/bin/sh

# Output immediately to prove script is running
echo "============================================"
echo "RAILWAY STARTUP SCRIPT EXECUTING"
echo "============================================"
echo "Time: $(date)"
echo "PID: $$"
echo "Working directory: $(pwd)"
echo ""

# Don't exit on error initially - we want to start even if migrations fail
set +e

echo "🚀 Railway startup script"

# Helper to run db push safely
run_db_push() {
  echo "🧱 Falling back to 'prisma db push' to ensure tables exist..."
  # Add sslmode=require if not present (helps with Railway public proxy)
  case "$DATABASE_URL" in
    *sslmode=*) ;; # already present
    postgresql://*) 
      if echo "$DATABASE_URL" | grep -q '\?'; then
        export DATABASE_URL="${DATABASE_URL}&sslmode=require"
      else
        export DATABASE_URL="${DATABASE_URL}?sslmode=require"
      fi
      ;;
  esac
  npx prisma db push --accept-data-loss && echo "✅ Schema pushed successfully" || echo "⚠️  prisma db push failed"
}

# Run Prisma migrations (only on Railway with DATABASE_URL)
# Use aggressive timeouts to prevent hanging
if [ -n "$DATABASE_URL" ]; then
  echo "📦 Preparing database (DATABASE_URL detected)"
  echo "   Database URL pattern: $(echo "$DATABASE_URL" | sed 's/:[^@]*@/:***@/')"
  echo ""
  echo "   ⚠️  Migration timeout set to 30 seconds to prevent hanging"
  echo "   ⚠️  Server will start even if migrations fail"
  echo ""

  # Wrap entire migration section in timeout
  (
    # Prefer migrate deploy if migrations are present, otherwise db push
    if [ -d "/app/prisma/migrations" ] && [ "$(ls -A /app/prisma/migrations 2>/dev/null)" ]; then
      echo "📜 Migrations found. Running 'prisma migrate deploy'..."
      if timeout 30 npx prisma migrate deploy 2>&1; then
        echo "✅ Migrations complete"
      else
        EXIT_CODE=$?
        echo "❌ 'prisma migrate deploy' failed with exit code: $EXIT_CODE"
        if [ $EXIT_CODE -eq 124 ]; then
          echo "   (Timeout reached - database may be unreachable)"
        fi
        echo "   Skipping fallback - will start server anyway"
      fi
    else
      echo "ℹ️  No migrations directory or it's empty."
      echo "   Skipping migrations - schema should already exist"
    fi
  ) || echo "⚠️  Migration section failed, continuing to server startup..."
else
  echo "⚠️  No DATABASE_URL found, skipping migrations"
  echo "   This is normal for development, but required for production"
fi

# Start the application
echo ""
echo "============================================"
echo "STARTING APPLICATION SERVER"
echo "============================================"
echo "🎬 Starting server..."
echo "📂 Working directory: $(pwd)"
echo "📂 Directory contents:"
ls -la | head -15
echo ""
echo "🔍 Node version: $(node --version)"
echo "🔍 NPM version: $(npm --version)"
echo "🔍 Index.js exists: $([ -f index.js ] && echo 'YES' || echo 'NO')"
echo "🔍 Server.js exists: $([ -f server.js ] && echo 'YES' || echo 'NO')"
echo "� Frontend directory exists: $([ -d frontend ] && echo 'YES' || echo 'NO')"
echo ""
echo "📝 Environment:"
echo "   NODE_ENV: ${NODE_ENV:-not set}"
echo "   PORT: ${PORT:-not set}"
echo "   DATABASE_URL: $([ -n "$DATABASE_URL" ] && echo 'configured' || echo 'not set')"
echo ""
echo "�🚀 Executing: node index.js"
echo "========================================="
echo ""

# Execute with explicit error handling
exec node index.js 2>&1
