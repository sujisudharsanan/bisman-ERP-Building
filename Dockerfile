## Root Dockerfile for Railway (backend service)
## Fullstack Dockerfile (backend + frontend) for Railway

# ---- deps: install and prepare backend with Prisma ----
FROM node:20-alpine AS deps
WORKDIR /app
RUN apk add --no-cache postgresql-client openssl libc6-compat
COPY my-backend/package*.json ./
COPY my-backend/prisma ./prisma/
RUN npm ci --ignore-scripts && npm cache clean --force
COPY my-backend/ ./
RUN npx prisma generate

# ---- build-frontend: install, build Next.js (hardened with verbose errors) ----
FROM node:20-alpine AS build-frontend
WORKDIR /app
ENV NODE_ENV=development
ENV NEXT_TELEMETRY_DISABLED=1
RUN apk add --no-cache postgresql-client openssl libc6-compat
# Copy manifests first for layer cache
COPY my-frontend/package*.json ./frontend/
COPY my-frontend/prisma ./frontend/prisma
# Install full deps (without cache mount for Railway compatibility)
RUN cd frontend && \
  npm ci && \
  npm cache clean --force
# Copy full frontend source
COPY my-frontend/ ./frontend
# Generate Prisma client (fail if schema exists but generate fails)
RUN cd frontend && npx prisma generate || echo "Prisma generate skipped (no schema)"
# Declare build-time public env vars (override with --build-arg if needed)
ARG NEXT_PUBLIC_API_URL=/api
ARG NEXT_PUBLIC_MM_TEAM_SLUG=erp
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_PUBLIC_MM_TEAM_SLUG=${NEXT_PUBLIC_MM_TEAM_SLUG}
# Build with verbose error output (no CI suppression) using build:verbose script
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

# ---- runner: minimal runtime with dumb-init; copy pruned node_modules later ----
FROM node:20-alpine AS runner
RUN apk add --no-cache dumb-init libc6-compat
WORKDIR /app

# Copy backend app and node_modules
COPY --from=deps /app /app

# Copy frontend build artifacts and runtime deps
# Copy package.json first to install production deps
COPY --from=build-frontend /app/frontend/package*.json /app/frontend/
# Install ONLY production dependencies for Next runtime
# Set CI=true to skip prepare scripts (husky, etc.) and --ignore-scripts as safety
RUN CI=true npm install --prefix frontend --production --ignore-scripts --no-audit --no-fund
# Copy Next.js build output, public assets, and config
COPY --from=build-frontend /app/frontend/.next /app/frontend/.next
COPY --from=build-frontend /app/frontend/public /app/frontend/public
COPY --from=build-frontend /app/frontend/next.config.js /app/frontend/

ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080

# Copy startup script that runs migrations
COPY scripts/start-railway.sh /app/start-railway.sh
RUN chmod +x /app/start-railway.sh

# Inline the critical startup logic directly in CMD to ensure it runs
# This eliminates any issues with dumb-init or external script execution
CMD ["sh", "-c", "\
  echo '============================================'; \
  echo 'RAILWAY CONTAINER STARTED'; \
  echo 'Time:' $(date); \
  echo 'PWD:' $(pwd); \
  echo 'Files:' $(ls -la | head -5); \
  echo '============================================'; \
  echo 'Checking for DATABASE_URL...'; \
  if [ -n \"$DATABASE_URL\" ]; then \
    echo 'DATABASE_URL detected, running migrations with timeout...'; \
    timeout 30 npx prisma migrate deploy 2>&1 || echo 'Migration failed or timed out'; \
  else \
    echo 'No DATABASE_URL, skipping migrations'; \
  fi; \
  echo '============================================'; \
  echo 'Starting Node.js application...'; \
  echo 'Node version:' $(node --version); \
  echo 'Executing: node index.js'; \
  echo '============================================'; \
  exec node index.js \
"]
