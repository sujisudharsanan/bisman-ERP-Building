#!/usr/bin/env bash
set -e

# ===============================
# CONFIGURATION — DO NOT LEAVE PLACEHOLDERS
# ===============================
LOCAL_PGHOST="localhost"
LOCAL_PGPORT="5432"
LOCAL_PGUSER="postgres"
LOCAL_PGDB="BISMAN"
LOCAL_PGPASSWORD="Suji@123"

RENDER_SERVICE_NAME="bisman-ERP"
RENDER_PG_EXTERNAL_URL="postgresql://bisman_db_user:Gnfm90pyzkgrtbxf7kxUy5q6nxis8MKW@dpg-d3lk5upr0fns73e2gk1g-a/bisman_db"

BACKEND_DIR="/Users/abhi/Desktop/BISMAN 
ERP/my-backend"

# ===============================
# 0) Check Render CLI installed
# ===============================
if ! command -v render &> /dev/null
then
    echo "Render CLI could not be found. 
Install: brew install render"
    exit 1
fi

# ===============================
# 1) EXPORT LOCAL DATABASE
# ===============================
DUMP_FILE="db-dump-$(date 
+%Y%m%d-%H%M%S).dump"
export PGPASSWORD="$LOCAL_PGPASSWORD"

echo "Exporting local database $LOCAL_PGDB 
..."
pg_dump -h "$LOCAL_PGHOST" -p "$LOCAL_PGPORT" 
-U "$LOCAL_PGUSER" -d "$LOCAL_PGDB" -Fc 
--no-owner --no-privileges -f "$DUMP_FILE"
echo "Created dump: $DUMP_FILE"

# ===============================
# 2) RESTORE TO RENDER POSTGRES
# ===============================
export PGSSLMODE="require"
echo "Restoring dump to Render PostgreSQL 
..."
pg_restore --clean --if-exists --no-owner 
--no-privileges -d "$RENDER_PG_EXTERNAL_URL" 
"$DUMP_FILE"
echo "Database restored successfully."

# ===============================
# 3) SET DATABASE_URL AND NODE_ENV IN RENDER
# ===============================
echo "Setting DATABASE_URL and NODE_ENV via 
Render CLI ..."
render services env:set 
"$RENDER_SERVICE_NAME" 
DATABASE_URL="$RENDER_PG_EXTERNAL_URL"
render services env:set 
"$RENDER_SERVICE_NAME" NODE_ENV="production"
echo "Environment variables set."

# ===============================
# 4) PRISMA STEPS
# ===============================
echo "Running Prisma generate and migrations 
..."
cd "$BACKEND_DIR"
npx prisma generate
npx prisma migrate deploy
echo "Prisma client generated and migrations 
deployed."

# ===============================
# 5) ADD EXPRESS DB-CHECK ROUTE
# ===============================
echo "Add this route in your Express app 
(app.js):"
cat <<'EOF'

const { PrismaClient } = 
require('@prisma/client');
const prisma = new PrismaClient();

app.get('/api/db-check', async (req, res) => 
{
  try {
    const now = await prisma.$queryRaw`SELECT 
NOW() as now`;
    res.json({ success: true, database: 
'connected', now: now?.[0]?.now || null });
  } catch (err) {
    console.error('DB check failed:', err);
    res.status(500).json({ success: false, 
error: 'Database connection failed' });
  }
});

EOF

# ===============================
# 6) VERIFY CONNECTION
# ===============================
echo "Verify connection in production:"
echo "curl -s 
https://<your-backend-service.onrender.com>/api/db-check 
| jq ."

echo "✅ Migration and setup script completed 
successfully."


