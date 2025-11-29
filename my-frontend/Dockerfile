# Railway Deploy - Force Rebuild 2025-11-28 20:15
ARG CACHEBUST=20251128-2015
FROM node:20-bullseye-slim AS deps
WORKDIR /app
RUN echo "Cache bust: ${CACHEBUST:-default}" && \
    apt-get update && \
    apt-get install -y openssl libssl1.1 ca-certificates && \
    rm -rf /var/lib/apt/lists/* && \
    ldconfig && \
    ldconfig -p | grep libssl
COPY package.json package-lock.json* ./
RUN npm ci --include=dev

FROM node:20-bullseye-slim AS builder
ARG CACHEBUST=20251128-2015
WORKDIR /app
RUN echo "Builder cache bust: ${CACHEBUST:-default}" && \
    apt-get update && \
    apt-get install -y openssl libssl1.1 ca-certificates && \
    rm -rf /var/lib/apt/lists/* && \
    ldconfig && \
    ldconfig -p | grep libssl
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ENV RAILWAY=1
ENV CI=true
RUN npm run build

FROM node:20-bullseye-slim AS runner
ARG CACHEBUST=20251128-2015
WORKDIR /app
RUN echo "Runner cache bust: ${CACHEBUST:-default}" && \
    apt-get update && \
    apt-get install -y openssl libssl1.1 ca-certificates && \
    rm -rf /var/lib/apt/lists/* && \
    ldconfig && \
    echo "=== Verifying libssl1.1 installation ===" && \
    ldconfig -p | grep libssl || (echo "ERROR: libssl1.1 not found!" && exit 1)
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV HOST=0.0.0.0
RUN groupadd -g 1001 nodejs && useradd -u 1001 -g nodejs -m nextjs
RUN chown -R nextjs:nodejs /app
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
# Copy Prisma client (required for database operations at runtime)
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma
USER nextjs
EXPOSE 3000
# Start server - Railway provides PORT=3000, HOSTNAME binds to 0.0.0.0
CMD ["node", "server.js"]
