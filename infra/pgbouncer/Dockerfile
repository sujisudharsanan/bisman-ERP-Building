# PgBouncer Dockerfile with RDS CA Bundle
# =========================================
# Custom PgBouncer image with AWS RDS CA certificates pre-installed

FROM edoburu/pgbouncer:1.21.0

# Labels
LABEL maintainer="BISMAN ERP Team"
LABEL description="PgBouncer with AWS RDS TLS support"

# Install curl for health checks and CA download
USER root
RUN apk add --no-cache curl ca-certificates postgresql-client

# Download AWS RDS CA bundle for TLS connections
RUN curl -sSL -o /etc/ssl/certs/rds-ca-bundle.pem \
    https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem && \
    chmod 644 /etc/ssl/certs/rds-ca-bundle.pem

# Create directories
RUN mkdir -p /var/log/pgbouncer /var/run/pgbouncer && \
    chown -R pgbouncer:pgbouncer /var/log/pgbouncer /var/run/pgbouncer

# Copy configuration files
COPY pgbouncer.ini /etc/pgbouncer/pgbouncer.ini
COPY userlist.txt /etc/pgbouncer/userlist.txt

# Set permissions
RUN chmod 640 /etc/pgbouncer/pgbouncer.ini && \
    chmod 600 /etc/pgbouncer/userlist.txt && \
    chown -R pgbouncer:pgbouncer /etc/pgbouncer

# Health check script
COPY healthcheck.sh /usr/local/bin/healthcheck.sh
RUN chmod +x /usr/local/bin/healthcheck.sh

# Switch back to pgbouncer user
USER pgbouncer

# Expose PgBouncer port
EXPOSE 6432

# Health check
HEALTHCHECK --interval=10s --timeout=5s --start-period=10s --retries=3 \
    CMD /usr/local/bin/healthcheck.sh

# Default command
CMD ["pgbouncer", "/etc/pgbouncer/pgbouncer.ini"]
