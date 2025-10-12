#!/usr/bin/env bash
set -e

# -----------------------------
# 1) Local DB Credentials
# -----------------------------
LOCAL_PGHOST="localhost"
LOCAL_PGPORT="5432"
LOCAL_PGUSER="postgres"
LOCAL_PGDB="BISMAN"
LOCAL_PGPASSWORD="Suji@123"

# -----------------------------
# 2) Render DB External URL
# -----------------------------
RENDER_PG_EXTERNAL_URL="postgresql://bisman_db_user:Gnfm90pyzkgrtbxf7kxUy5q6nxis8MKW@dpg-d3lk5upr0fns73e2gk1g-a.oregon-postgres.render.com/bisman_db?sslmode=require"

# -----------------------------
# 3) Timestamped dump file
# -----------------------------
DUMP_FILE="db-dump-$(/bin/date +%Y%m%d-%H%M%S).dump"
echo "Dump file will be: $DUMP_FILE"

# -----------------------------
# 4) Export local DB
# -----------------------------
echo "Creating local dump..."
PGPASSWORD="$LOCAL_PGPASSWORD" pg_dump \
  -h "$LOCAL_PGHOST" -p "$LOCAL_PGPORT" -U 
"$LOCAL_PGUSER" \
  -d "$LOCAL_PGDB" -Fc --no-owner --no-privileges \
  -f "$DUMP_FILE"

echo "Local dump created: $DUMP_FILE (check with ls -lh 
$DUMP_FILE)"

# -----------------------------
# 5) Restore to Render
# -----------------------------
echo "Restoring to Render..."
export PGSSLMODE=require
pg_restore --clean --if-exists --no-owner --no-privileges 
\
  -d "$RENDER_PG_EXTERNAL_URL" "$DUMP_FILE"

echo "Restore complete."

