# ============================================================
# Stage 1: Dependencies (installs ALL deps including devDependencies)
# ============================================================
FROM node:20-alpine AS deps
WORKDIR /app
ENV NODE_ENV=development
ENV NEXT_TELEMETRY_DISABLED=1
RUN apk add --no-cache libc6-compat openssl postgresql-client
# Copy manifests for layer caching
COPY package*.json ./
COPY prisma ./prisma
# Install with cache mount for speed (requires Docker BuildKit)
RUN --mount=type=cache,target=/root/.npm \
  npm ci && \
  npm cache clean --force

# ============================================================
# Stage 2: Builder (runs prisma generate + next build with full error visibility)
# ============================================================
FROM node:20-alpine AS builder
WORKDIR /app
ENV NODE_ENV=development
ENV NEXT_TELEMETRY_DISABLED=1
RUN apk add --no-cache libc6-compat
# Reuse installed node_modules
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/prisma ./prisma
# Copy full source
COPY . ./
# Declare build-time public env vars (override with --build-arg if needed)
ARG NEXT_PUBLIC_API_URL=/api
ARG NEXT_PUBLIC_MM_TEAM_SLUG=erp
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_PUBLIC_MM_TEAM_SLUG=${NEXT_PUBLIC_MM_TEAM_SLUG}
# Generate Prisma client + build with verbose error output
RUN set -euxo pipefail && \
  npx prisma generate && \
  node -e "console.log('[info] Node',process.version,'npm',require('child_process').execSync('npm -v',{encoding:'utf8'}).trim())" && \
  npm run build:verbose || { \
    echo "===================================="; \
    echo "NEXT BUILD FAILED - Stack trace above"; \
    echo "===================================="; \
    echo "Listing .next directory:"; \
    ls -lah .next 2>/dev/null || echo ".next not created"; \
    exit 1; \
  }

# ============================================================
# Stage 3: Production Runtime (minimal, only production deps + .next output)
# ============================================================
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN apk add --no-cache libc6-compat dumb-init
# Copy package manifests
COPY package*.json ./
# Install ONLY production dependencies (no devDeps)
RUN --mount=type=cache,target=/root/.npm \
  npm ci --only=production --ignore-scripts --no-audit --no-fund && \
  npm cache clean --force
# Copy Next.js standalone build output (next.config.js must have output: 'standalone')
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
# Copy next.config.js for runtime config
COPY --from=builder /app/next.config.js ./
# Expose port (configurable via PORT env)
ENV PORT=3000
EXPOSE 3000
# Use dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server.js"]
