# Multi-stage Dockerfile for BISMAN ERP Backend
FROM node:18-alpine AS base

# Install system dependencies
RUN apk update && apk upgrade && \
    apk add --no-cache dumb-init postgresql-client

WORKDIR /app

# Copy backend files
FROM base AS backend-deps
WORKDIR /app
COPY my-backend/package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Production stage
FROM node:18-alpine AS production

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init postgresql-client

WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S backenduser -u 1001

# Copy dependencies
COPY --from=backend-deps --chown=backenduser:nodejs /app/node_modules ./node_modules

# Copy application code
COPY --chown=backenduser:nodejs my-backend/ ./

# Generate Prisma Client
RUN npx prisma generate

# Switch to non-root user
USER backenduser

# Expose backend port (Render uses PORT env var)
EXPOSE 10000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT:-10000}/health || exit 1

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "index.js"]
