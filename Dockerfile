# Root Dockerfile to build Next.js app in my-frontend/
# This is a thin wrapper around the app-specific Dockerfile so platforms
# that expect a root-level "Dockerfile" (like Railway UI) will succeed.

# 1) Install dependencies for the frontend (dev deps required to build)
FROM node:20-bookworm-slim AS deps
WORKDIR /app/my-frontend

ENV CI=true \
    NEXT_TELEMETRY_DISABLED=1 \
    npm_config_fund=false \
    npm_config_audit=false

COPY my-frontend/package.json ./
COPY my-frontend/package-lock.json* ./
COPY my-frontend/npm-shrinkwrap.json* ./

RUN if [ -f package-lock.json ] || [ -f npm-shrinkwrap.json ]; then \
      npm ci --include=dev; \
    else \
      npm install; \
    fi

# 2) Build the Next.js app (standalone output)
FROM node:20-bookworm-slim AS builder
WORKDIR /app/my-frontend

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    RAILWAY=1

COPY --from=deps /app/my-frontend/node_modules ./node_modules
COPY my-frontend/ .

RUN npm run build

# 3) Runtime image
FROM node:20-bookworm-slim AS runner
WORKDIR /app/my-frontend

ENV NODE_ENV=production \
    PORT=3000 \
    NEXT_TELEMETRY_DISABLED=1

RUN groupadd -g 1001 nodejs \
 && useradd -u 1001 -g nodejs -m nextjs

# Public assets
COPY --from=builder /app/my-frontend/public ./public
# Standalone server and required node_modules
COPY --from=builder /app/my-frontend/.next/standalone ./
# Static assets
COPY --from=builder /app/my-frontend/.next/static ./.next/static

USER nextjs
EXPOSE 3000

# Railway default expects "node server.js"
CMD ["node", "server.js"]
