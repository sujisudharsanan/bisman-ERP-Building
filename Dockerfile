# Root Dockerfile that builds the Next.js app when Railway sets root_dir to my-frontend
# Use paths relative to the build context (my-frontend) to avoid COPY path not found.

# 1) Install dependencies (including dev) for building
FROM node:20-bookworm-slim AS deps
WORKDIR /app

ENV CI=true \
    NEXT_TELEMETRY_DISABLED=1 \
    npm_config_fund=false \
    npm_config_audit=false

# Copy lockfiles first for better layer caching
COPY package.json ./
COPY package-lock.json* ./
COPY npm-shrinkwrap.json* ./

RUN if [ -f package-lock.json ] || [ -f npm-shrinkwrap.json ]; then \
      npm ci --include=dev; \
    else \
      npm install; \
    fi

# 2) Build the Next.js app (standalone output)
FROM node:20-bookworm-slim AS builder
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    RAILWAY=1

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run build

# 3) Runtime image
FROM node:20-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production \
    PORT=3000 \
    NEXT_TELEMETRY_DISABLED=1

RUN groupadd -g 1001 nodejs \
 && useradd -u 1001 -g nodejs -m nextjs

# Public assets
COPY --from=builder /app/public ./public
# Standalone server and required node_modules
COPY --from=builder /app/.next/standalone ./
# Static assets
COPY --from=builder /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000

# Railway default expects "node server.js"
CMD ["node", "server.js"]
