# Deploy Mattermost Team Edition on Railway using the official image.
# Relies on env vars provided by Railway and our provisioning script.

FROM mattermost/mattermost-team-edition:latest

# Make Mattermost listen on the platform-provided PORT when present.
ENV PORT=8065 \
    MM_SERVICESETTINGS_LISTENADDRESS=":${PORT}" \
    MM_SQLSETTINGS_DRIVERNAME=postgres \
    MM_PLUGINSETTINGS_ENABLE="true" \
    MM_SERVICESETTINGS_ENABLEPERSONALACCESSTOKENS="true" \
    MM_SERVICESETTINGS_ENABLEUSERACCESSTOKENS="true"

# Default EXPOSE for docs; Railway routes to the running container port.
EXPOSE 8065
