#!/bin/bash

# Get the database URL from Railway
DB_URL=$(railway variables --service bisman-erp-db | grep DATABASE_URL | cut -d'=' -f2)

if [ -z "$DB_URL" ]; then
    echo "Error: Could not get DATABASE_URL from Railway"
    exit 1
fi

echo "Database URL found"
echo "Restoring database from dump file..."

# Restore the database
pg_restore --verbose --clean --no-acl --no-owner \
    -d "$DB_URL" \
    database-backups/bisman_backup_20251114_012648.dump

if [ $? -eq 0 ]; then
    echo "✅ Database restored successfully!"
else
    echo "❌ Database restore failed"
    exit 1
fi

# Verify the restore
echo ""
echo "Verifying tables..."
psql "$DB_URL" -c "\dt"
