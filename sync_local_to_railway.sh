#!/bin/bash
set -e

# Local DB config
LOCAL_DB="BISMAN"
LOCAL_USER="postgres"
LOCAL_HOST="localhost"

# Railway DB config
RAILWAY_DB="railway"
RAILWAY_USER="postgres"
RAILWAY_PASS="sstdOVvKqTCiPiKRKtRSpnrtkgEUdKnj"
RAILWAY_HOST="gondola.proxy.rlwy.net"
RAILWAY_PORT="53308"

# Dump file
DUMP_FILE="bisman_local_dump.dump"

# Export local database
pg_dump -U $LOCAL_USER -h $LOCAL_HOST -d $LOCAL_DB -Fc -f $DUMP_FILE

# Import to Railway database
PGPASSWORD="$RAILWAY_PASS" pg_restore -h $RAILWAY_HOST -p $RAILWAY_PORT -U $RAILWAY_USER -d $RAILWAY_DB -c $DUMP_FILE

echo "Sync complete!"
