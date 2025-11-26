#!/bin/bash
# ====================================================================
# Remove Demo Users from Railway Database
# ====================================================================
# Quick script to remove demo users from Railway production database
# Usage: bash remove-demo-users-railway.sh
# ====================================================================

echo "======================================================================"
echo "Remove Demo Users from Railway Database"
echo "======================================================================"
echo ""
echo "⚠️  WARNING: This will permanently delete demo users from Railway!"
echo ""
read -p "Are you sure you want to continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "❌ Aborted. No changes made."
    exit 0
fi

echo ""
echo "🔗 Connecting to Railway database..."
echo ""

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not found. Please install it first:"
    echo "   npm install -g @railway/cli"
    echo "   or visit: https://docs.railway.app/develop/cli"
    exit 1
fi

# Run the SQL script via Railway
cat remove-demo-users-safe.sql | railway connect bisman-erp-db

echo ""
echo "======================================================================"
echo "✅ Demo users removal complete!"
echo "======================================================================"
echo ""
echo "Next steps:"
echo "1. Verify users were deleted by checking Railway dashboard"
echo "2. Test login with production users"
echo "3. Update any documentation if needed"
echo ""
