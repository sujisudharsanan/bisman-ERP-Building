# Deploy Mattermost Team Edition on Railway
# Simplified - let Railway handle PORT via environment variables

FROM mattermost/mattermost-team-edition:latest

# Set environment defaults
ENV MM_SQLSETTINGS_DRIVERNAME=postgres \
    MM_FILESETTINGS_DRIVERNAME=local \
    MM_FILESETTINGS_DIRECTORY=/mattermost/data \
    MM_PLUGINSETTINGS_ENABLE="true" \
    MM_SERVICESETTINGS_ENABLEPERSONALACCESSTOKENS="true" \
    MM_SERVICESETTINGS_ENABLEUSERACCESSTOKENS="true"

# Expose the port
EXPOSE 8065

# Use the default Mattermost entrypoint and command
# We'll set MM_SERVICESETTINGS_LISTENADDRESS via Railway variables
