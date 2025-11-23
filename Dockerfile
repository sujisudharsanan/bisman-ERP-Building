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

# ---- build-frontend: install, build, export Next.js ----
FROM node:20-alpine AS build-frontend
WORKDIR /app
RUN apk add --no-cache postgresql-client openssl libc6-compat
COPY my-frontend/package*.json ./frontend/
## Install full dependency tree (allowing postinstall scripts) for a reliable Next.js build.
## The previous build used --ignore-scripts which can break packages (e.g. Prisma) and cause silent failures.
RUN cd frontend && npm ci && npm cache clean --force
COPY my-frontend/ ./frontend
## Generate Prisma client if schema exists; ignore failure so build continues even if frontend doesn't need it.
RUN cd frontend && npx prisma generate || echo "Prisma generate skipped (no schema)"
## CI flags to skip telemetry & heavy dev checks; lint/type-check already bypassed via scripts logic.
ENV CI=true
ENV RAILWAY=1
ENV NEXT_TELEMETRY_DISABLED=1
## Provide a sensible default API base. Frontend code prefers same-origin proxy; /api works inside container/nginx.
ARG NEXT_PUBLIC_API_URL=/api
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
## Build Next.js application. If it fails, output a hint.
RUN npm run build --prefix frontend || (echo "\n==== Next build failed. Ensure dev deps & prisma schema present. Provide NEXT_PUBLIC_API_URL if required. ====" && exit 1)

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

ENTRYPOINT ["dumb-init", "--"]
CMD ["/app/start-railway.sh"]
