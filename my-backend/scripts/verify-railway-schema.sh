#!/bin/bash
# Railway Database Schema Verification Script
# Run this locally to verify Railway DB matches local schema

set -e

echo "╔════════════════════════════════════════════════════════════╗"
echo "║  Railway Database Schema Verification                      ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

cd "$(dirname "$0")"

echo "📊 Checking Railway database tables..."
echo ""

TABLES=$(railway connect bisman-erp-db <<'EOF' 2>/dev/null
SELECT COUNT(*) FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE';
\q
EOF
)

echo "✅ Tables found: $(echo $TABLES | grep -o '[0-9]\+')"
echo ""

echo "🔍 Verifying critical System Health tables..."
railway connect bisman-erp-db <<'EOF'
SELECT 
  EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'system_health_config') as health_config,
  EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'system_metric_samples') as metric_samples,
  EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'system_metric_daily') as metric_daily,
  EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'load_test_reports') as load_tests,
  EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'rate_limit_violations') as rate_limits;
\q
EOF

echo ""
echo "🔐 Verifying migration history..."
railway connect bisman-erp-db <<'EOF'
SELECT 
  migration_name,
  finished_at IS NOT NULL as applied,
  rolled_back_at IS NOT NULL as rolled_back,
  applied_steps_count
FROM _prisma_migrations 
ORDER BY started_at DESC
LIMIT 5;
\q
EOF

echo ""
echo "📈 Checking table row counts..."
railway connect bisman-erp-db <<'EOF'
SELECT 'users' as table_name, COUNT(*) as rows FROM users
UNION ALL SELECT 'clients', COUNT(*) FROM clients
UNION ALL SELECT 'payment_requests', COUNT(*) FROM payment_requests
UNION ALL SELECT 'system_health_config', COUNT(*) FROM system_health_config
ORDER BY table_name;
\q
EOF

echo ""
echo -e "${GREEN}✅ Verification complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Trigger Railway backend redeploy"
echo "2. Check logs: railway logs --service bisman-erp-backend"
echo "3. Test API: curl https://bisman-erp-backend-production.up.railway.app/api/health"
