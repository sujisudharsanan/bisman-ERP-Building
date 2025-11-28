ARG CACHEBUST=20251128-1403
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
ARG CACHEBUST=20251128-1403
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
ARG CACHEBUST=20251128-1403
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
ENV PORT=3000
RUN groupadd -g 1001 nodejs && useradd -u 1001 -g nodejs -m nextjs
RUN chown -R nextjs:nodejs /app
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
