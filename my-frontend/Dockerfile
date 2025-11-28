# Multi-stage Dockerfile for Next.js 15 (standalone output)
# Works on Railway with startCommand: "node server.js"

# 1) Install dependencies (including dev) for building
FROM node:20-bookworm-slim AS deps
WORKDIR /app

# Avoid download progress noise and ensure reproducible installs
ENV CI=true \
  NEXT_TELEMETRY_DISABLED=1 \
  npm_config_fund=false \
  npm_config_audit=false

# Copy lockfiles first for better layer caching
COPY package.json ./
COPY package-lock.json* ./
COPY npm-shrinkwrap.json* ./

# Install dependencies (dev deps required to build Next)
RUN if [ -f package-lock.json ] || [ -f npm-shrinkwrap.json ]; then \
    npm ci --include=dev; \
  else \
    npm install; \
  fi

# 2) Build the app (Next.js outputs standalone server)
FROM node:20-bookworm-slim AS builder
WORKDIR /app

# Install OpenSSL in builder stage too
RUN apt-get update -y && \
    apt-get install -y openssl libssl3 && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production \
  NEXT_TELEMETRY_DISABLED=1 \
  RAILWAY=1 \
  OPENSSL_LIB_DIR=/usr/lib/x86_64-linux-gnu \
  PRISMA_ENGINES_MIRROR=https://binaries.prisma.sh

# Copy installed node_modules from deps
COPY --from=deps /app/node_modules ./node_modules
# Copy app source
COPY . .

# Build Next.js (prisma generate now runs in prebuild script in package.json)
RUN npm run build

# 3) Runtime image: minimal Node with standalone server
FROM node:20-bookworm-slim AS runner
WORKDIR /app

# Install OpenSSL FIRST before any ENV or other commands
RUN echo "=== Installing OpenSSL for Prisma ===" && \
    apt-get update -y && \
    apt-get install -y openssl libssl3 ca-certificates && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/* && \
    ldconfig && \
    echo "=== OpenSSL installed, available libraries: ===" && \
    ldconfig -p | grep libssl || echo "No libssl found"

ENV NODE_ENV=production \
  PORT=3000 \
  NEXT_TELEMETRY_DISABLED=1 \
  OPENSSL_LIB_DIR=/usr/lib/x86_64-linux-gnu

# Create non-root user
RUN groupadd -g 1001 nodejs \
 && useradd -u 1001 -g nodejs -m nextjs

# Copy public assets
COPY --from=builder /app/public ./public
# Copy standalone server (contains server.js and needed node_modules)
COPY --from=builder /app/.next/standalone ./
# Copy Next static files for assets
COPY --from=builder /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000

# Railway's startCommand in railway.toml is "node server.js"; keep CMD aligned
CMD ["node", "server.js"]
