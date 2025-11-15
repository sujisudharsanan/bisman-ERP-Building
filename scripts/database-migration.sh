#!/bin/bash

echo "🗄️ BISMAN ERP - Database Migration Script"
echo "=========================================="
echo ""

# Configuration
DB_USER="postgres"
DB_NAME="BISMAN"
BACKUP_DIR="./database-backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p "$BACKUP_DIR"

echo "📦 Step 1: Creating database backup..."
echo "---------------------------------------"
pg_dump -U $DB_USER -d $DB_NAME -F c -b -v -f "$BACKUP_DIR/bisman_backup_$TIMESTAMP.dump"

if [ $? -eq 0 ]; then
  echo "✅ Backup created: $BACKUP_DIR/bisman_backup_$TIMESTAMP.dump"
else
  echo "❌ Backup failed!"
  exit 1
fi

echo ""
echo "📤 Step 2: Creating SQL export for production..."
echo "-------------------------------------------------"
pg_dump -U $DB_USER -d $DB_NAME -F p -f "$BACKUP_DIR/bisman_production_$TIMESTAMP.sql"

if [ $? -eq 0 ]; then
  echo "✅ SQL export created: $BACKUP_DIR/bisman_production_$TIMESTAMP.sql"
else
  echo "❌ SQL export failed!"
  exit 1
fi

echo ""
echo "📋 Step 3: Creating schema-only export..."
echo "------------------------------------------"
pg_dump -U $DB_USER -d $DB_NAME -s -f "$BACKUP_DIR/bisman_schema_$TIMESTAMP.sql"

if [ $? -eq 0 ]; then
  echo "✅ Schema export created: $BACKUP_DIR/bisman_schema_$TIMESTAMP.sql"
else
  echo "❌ Schema export failed!"
  exit 1
fi

echo ""
echo "📊 Step 4: Database statistics..."
echo "----------------------------------"
psql -U $DB_USER -d $DB_NAME << EOF
\echo ''
\echo '📈 Table Row Counts:'
\echo '-------------------'
SELECT 
  'users' as table_name, 
  COUNT(*) as row_count 
FROM users 
UNION ALL 
SELECT 'rbac_roles', COUNT(*) FROM rbac_roles 
UNION ALL 
SELECT 'rbac_permissions', COUNT(*) FROM rbac_permissions 
UNION ALL 
SELECT 'rbac_user_permissions', COUNT(*) FROM rbac_user_permissions
UNION ALL
SELECT 'rbac_role_permissions', COUNT(*) FROM rbac_role_permissions
UNION ALL
SELECT 'password_reset_tokens', COUNT(*) FROM password_reset_tokens
UNION ALL
SELECT 'support_tickets', COUNT(*) FROM support_tickets
ORDER BY table_name;

\echo ''
\echo '👥 User Roles Distribution:'
\echo '--------------------------'
SELECT role, COUNT(*) as count 
FROM users 
GROUP BY role 
ORDER BY count DESC;

\echo ''
\echo '📄 Pages by Module:'
\echo '------------------'
SELECT module_name, COUNT(*) as page_count 
FROM rbac_permissions 
GROUP BY module_name 
ORDER BY page_count DESC;
EOF

echo ""
echo "✅ Database migration preparation complete!"
echo ""
echo "📁 Backup files created:"
echo "------------------------"
ls -lh "$BACKUP_DIR"/bisman_*_$TIMESTAMP.*

echo ""
echo "📏 File sizes:"
echo "-------------"
du -h "$BACKUP_DIR"/bisman_*_$TIMESTAMP.*

echo ""
echo "🚀 Next steps for production deployment:"
echo "----------------------------------------"
echo "1. Review SQL file: $BACKUP_DIR/bisman_production_$TIMESTAMP.sql"
echo "2. Upload to production server"
echo "3. Create production database:"
echo "   createdb -U <prod_user> <prod_db_name>"
echo ""
echo "4. Import schema first:"
echo "   psql -U <prod_user> -d <prod_db> -f bisman_schema_$TIMESTAMP.sql"
echo ""
echo "5. Import full data:"
echo "   psql -U <prod_user> -d <prod_db> -f bisman_production_$TIMESTAMP.sql"
echo ""
echo "6. Verify import:"
echo "   psql -U <prod_user> -d <prod_db> -c 'SELECT COUNT(*) FROM users;'"
echo ""
echo "7. Test authentication with Hub Incharge credentials"
echo ""
echo "✨ Database backup complete! Ready for deployment."
