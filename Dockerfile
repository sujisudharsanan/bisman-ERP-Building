# Monorepo Multi-Stage Dockerfile for Railway
# Builds both backend and frontend in a single container
# BUILD_VERSION: 2025-11-28-v2

# ============================================
# Stage 1: Backend Dependencies
# ============================================
FROM node:20-alpine AS deps
WORKDIR /app

# Install system dependencies for Prisma
RUN apk add --no-cache postgresql-client openssl libc6-compat

# Copy backend package files
COPY my-backend/package*.json ./
COPY my-backend/prisma ./prisma/

# Install backend dependencies
RUN npm ci --ignore-scripts && npm cache clean --force

# Copy backend source
COPY my-backend/ ./

# Generate Prisma client
RUN npx prisma generate && npm prune --omit=dev

# ============================================
# Stage 2: Frontend Build
# ============================================
FROM node:20-alpine AS build-frontend
WORKDIR /app

# Install system dependencies
RUN apk add --no-cache postgresql-client openssl libc6-compat

# Copy frontend package files
COPY my-frontend/package*.json ./frontend/
COPY my-frontend/prisma ./frontend/prisma

# Install frontend dependencies
RUN cd frontend && \
  npm ci && \
  npm cache clean --force

# Copy frontend source
COPY my-frontend/ ./frontend

# Generate Prisma client for frontend (if schema exists)
RUN cd frontend && npx prisma generate || echo "Prisma generate skipped (no schema)"

# Build Next.js application
RUN set -euxo pipefail && \
  cd frontend && \
  node -e "console.log('[info] Node',process.version)" && \
  npm run build:verbose || { \
    echo "===================================="; \
    echo "NEXT BUILD FAILED - Stack trace above"; \
    echo "===================================="; \
    echo "Listing .next directory:"; \
    ls -lah .next 2>/dev/null || echo ".next not created"; \
    exit 1; \
  }

# ============================================
# Stage 3: Production Runtime
# ============================================
FROM node:20-alpine AS runner

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init libc6-compat

WORKDIR /app

# Copy backend from deps stage
COPY --from=deps /app /app

# Copy frontend build artifacts and runtime deps
COPY --from=build-frontend /app/frontend/package*.json /app/frontend/
RUN CI=true npm install --prefix frontend --production --ignore-scripts --no-audit --no-fund

COPY --from=build-frontend /app/frontend/.next /app/frontend/.next
COPY --from=build-frontend /app/frontend/public /app/frontend/public
COPY --from=build-frontend /app/frontend/next.config.js /app/frontend/

# Copy startup script
COPY scripts/start-railway.sh /app/start-railway.sh
RUN chmod +x /app/start-railway.sh

# Set environment
ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080

# Use startup script that handles migrations
CMD ["/app/start-railway.sh"]
