# TEMP ROOT DOCKERFILE - Fallback because Railway Root Directory is set to '/'
# Remove this file after setting Root Directory to 'my-frontend'.
# Mirrors my-frontend/Dockerfile.

ARG CACHEBUST=20251129-0145
FROM node:20-bullseye-slim AS deps
WORKDIR /app
RUN apt-get update && apt-get install -y openssl libssl1.1 ca-certificates && rm -rf /var/lib/apt/lists/* && ldconfig
COPY my-frontend/package.json my-frontend/package-lock.json* ./
COPY my-frontend/prisma ./prisma
RUN npm ci --include=dev

FROM node:20-bullseye-slim AS builder
ARG CACHEBUST=20251129-0145
WORKDIR /app
RUN apt-get update && apt-get install -y openssl libssl1.1 ca-certificates && rm -rf /var/lib/apt/lists/* && ldconfig
COPY --from=deps /app/node_modules ./node_modules
COPY my-frontend/. .
ENV NODE_ENV=production RAILWAY=1 CI=true
RUN npm run build

FROM node:20-bullseye-slim AS runner
WORKDIR /app
RUN apt-get update && apt-get install -y openssl libssl1.1 ca-certificates curl && rm -rf /var/lib/apt/lists/* && ldconfig
ENV NODE_ENV=production HOSTNAME="0.0.0.0" HOST="0.0.0.0"
RUN groupadd -g 1001 nodejs && useradd -u 1001 -g nodejs -m nextjs
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
# Copy Prisma client (required for database operations at runtime)
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma
USER nextjs
EXPOSE 3000
# Debug and start server
CMD ["sh", "-c", "echo 'PORT=$PORT HOSTNAME=$HOSTNAME' && sleep 1 && exec node server.js"]
