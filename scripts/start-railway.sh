#!/bin/sh
set -e

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
if [ -n "$DATABASE_URL" ]; then
  echo "📦 Preparing database (DATABASE_URL detected)"

  # Prefer migrate deploy if migrations are present, otherwise db push
  if [ -d "/app/prisma/migrations" ] && [ "$(ls -A /app/prisma/migrations 2>/dev/null)" ]; then
    echo "📜 Migrations found. Running 'prisma migrate deploy'..."
    if npx prisma migrate deploy; then
      echo "✅ Migrations complete"
    else
      echo "❌ 'prisma migrate deploy' failed — details above"
      run_db_push
    fi
  else
    echo "ℹ️  No migrations directory or it's empty. Using 'prisma db push'..."
    run_db_push
  fi
else
  echo "⚠️  No DATABASE_URL found, skipping migrations"
fi

# Start the application
echo "🎬 Starting server..."
exec node index.js
