#!/bin/bash

echo "=== DATABASE COMPARISON ==="
echo ""

# Local database
echo "📍 LOCAL DATABASE (localhost:5432/BISMAN):"
psql postgresql://postgres@localhost:5432/BISMAN -c "\dt" 2>/dev/null | grep -E "table|rows|List" | head -40

echo ""
echo "=== LOCAL TABLE COUNT ==="
psql postgresql://postgres@localhost:5432/BISMAN -c "SELECT COUNT(*) as table_count FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';" 2>/dev/null

echo ""
echo "=== MIGRATION STATUS ==="
npx prisma migrate status 2>&1 | grep -A 20 "migrations found"

