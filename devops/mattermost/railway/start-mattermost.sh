#!/bin/bash
set -e

# Railway provides PORT dynamically, Mattermost needs MM_SERVICESETTINGS_LISTENADDRESS
export MM_SERVICESETTINGS_LISTENADDRESS=":${PORT:-8065}"

echo "========================================="
echo "Starting Mattermost on Railway"
echo "========================================="
echo "PORT: ${PORT:-8065}"
echo "Listen Address: ${MM_SERVICESETTINGS_LISTENADDRESS}"
echo "Database Driver: ${MM_SQLSETTINGS_DRIVERNAME}"
echo "Site URL: ${MM_SERVICESETTINGS_SITEURL}"
echo "========================================="

# Start Mattermost using the official entrypoint
exec /entrypoint.sh mattermost
