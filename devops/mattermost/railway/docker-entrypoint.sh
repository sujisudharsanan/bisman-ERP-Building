#!/bin/sh
set -e

# Railway provides PORT environment variable dynamically
# Set Mattermost to listen on Railway's PORT (defaults to 8065)
export MM_SERVICESETTINGS_LISTENADDRESS=":${PORT:-8065}"

echo "Starting Mattermost on port ${PORT:-8065}..."
echo "Database: ${MM_SQLSETTINGS_DRIVERNAME}"
echo "Site URL: ${MM_SERVICESETTINGS_SITEURL}"

# Execute the original Mattermost entrypoint
exec /entrypoint.sh "$@"
