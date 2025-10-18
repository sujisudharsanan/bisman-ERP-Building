## Root Dockerfile for Railway (backend service)
## Fullstack Dockerfile (backend + frontend) for Railway

# ---- deps: install and prepare backend with Prisma ----
FROM node:18-alpine AS deps
WORKDIR /app
RUN apk add --no-cache postgresql-client openssl libc6-compat
COPY my-backend/package*.json ./
COPY my-backend/prisma ./prisma/
RUN npm ci --ignore-scripts && npm cache clean --force
COPY my-backend/ ./
RUN npx prisma generate

# ---- build-frontend: install, build, export Next.js ----
FROM node:18-alpine AS build-frontend
WORKDIR /app
COPY my-frontend/package*.json ./frontend/
RUN npm install --prefix frontend
COPY my-frontend/ ./frontend
# In CI, skip lint/type-check prebuild and Next telemetry; build Next app
ENV CI=true
ENV VERCEL=1
ENV RAILWAY=1
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build --prefix frontend

# ---- runner: minimal runtime with dumb-init; copy pruned node_modules later ----
FROM node:18-alpine AS runner
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
COPY start-railway.sh /app/start-railway.sh
RUN chmod +x /app/start-railway.sh

ENTRYPOINT ["dumb-init", "--"]
CMD ["/app/start-railway.sh"]
