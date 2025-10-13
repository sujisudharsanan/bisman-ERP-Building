# Dockerfile for BISMAN ERP Backend
FROM node:18-alpine

# Install system dependencies including wget for health checks
RUN apk add --no-cache dumb-init postgresql-client wget

# Set working directory
WORKDIR /app

# Copy backend package files
COPY my-backend/package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy backend application code
COPY my-backend/ ./

# Generate Prisma Client
RUN npx prisma generate

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S backenduser -u 1001 && \
    chown -R backenduser:nodejs /app

# Switch to non-root user
USER backenduser

# Expose port (Render will set PORT env var)
EXPOSE 10000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT:-10000}/health || exit 1

# Start the application with dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "index.js"]
CMD ["node", "index.js"]
