#!/bin/sh
set -e

echo "🚀 Railway startup script"

# Run Prisma migrations (only on Railway with DATABASE_URL)
if [ -n "$DATABASE_URL" ]; then
  echo "📦 Running database migrations..."
  npx prisma migrate deploy
  echo "✅ Migrations complete"
else
  echo "⚠️  No DATABASE_URL found, skipping migrations"
fi

# Start the application
echo "🎬 Starting server..."
exec node server.js
