# Frontend-centric multi-stage Dockerfile (Option A)
# Build both backend and frontend when Railway sets build root to my-frontend/
# Adjust paths using ../ to reach backend and root-level startup script.
# BUILD_VERSION: 2025-11-28-optionA

# (cache bust handled per-stage with ARG FORCE_REBUILD)

# ============================================
# Stage 1: Backend Dependencies
# ============================================
FROM node:20-alpine AS deps
ARG FORCE_REBUILD=20251128
RUN echo "FORCE_REBUILD(deps)=${FORCE_REBUILD}" > /dev/null
WORKDIR /app

RUN apk add --no-cache postgresql-client openssl libc6-compat

# Backend package files (relative to my-frontend/ context: ../my-backend)
COPY ../my-backend/package*.json ./
COPY ../my-backend/prisma ./prisma/

RUN npm ci --ignore-scripts && npm cache clean --force

# Backend source
COPY ../my-backend/ ./

RUN npx prisma generate && npm prune --omit=dev

# ============================================
# Stage 2: Frontend Build
# ============================================
FROM node:20-alpine AS build-frontend
ARG FORCE_REBUILD=20251128
RUN echo "FORCE_REBUILD(build-frontend)=${FORCE_REBUILD}" > /dev/null
WORKDIR /app

RUN apk add --no-cache postgresql-client openssl libc6-compat

# Frontend package files (context local path)
COPY package*.json ./frontend/
COPY prisma ./frontend/prisma

RUN cd frontend && npm ci && npm cache clean --force

# Frontend source
COPY . ./frontend

RUN cd frontend && npx prisma generate || echo "Prisma generate skipped (no schema)"

RUN set -euxo pipefail \
  && cd frontend \
  && node -e "console.log('[info] Node',process.version)" \
  && npm run build:verbose || { \
    echo '===================================='; \
    echo 'NEXT BUILD FAILED - Stack trace above'; \
    echo '===================================='; \
    echo 'Listing .next directory:'; \
    ls -lah .next 2>/dev/null || echo '.next not created'; \
    exit 1; \
  }

# ============================================
# Stage 3: Production Runtime
# ============================================
FROM node:20-alpine AS runner
ARG FORCE_REBUILD=20251128
RUN echo "FORCE_REBUILD(runner)=${FORCE_REBUILD}" > /dev/null
RUN apk add --no-cache dumb-init libc6-compat
WORKDIR /app

# Copy backend from deps stage
COPY --from=deps /app /app

# Copy frontend build artifacts
COPY --from=build-frontend /app/frontend/package*.json /app/frontend/
RUN CI=true npm install --prefix frontend --production --ignore-scripts --no-audit --no-fund
COPY --from=build-frontend /app/frontend/.next /app/frontend/.next
COPY --from=build-frontend /app/frontend/public /app/frontend/public
COPY --from=build-frontend /app/frontend/next.config.js /app/frontend/

# Create startup script inline (no external file dependency)
RUN echo '#!/bin/sh' > /app/start-railway.sh && \
    echo 'echo "FRONTEND+BACKEND STARTUP"' >> /app/start-railway.sh && \
    echo 'echo "Time: $(date)"' >> /app/start-railway.sh && \
    echo 'set +e' >> /app/start-railway.sh && \
    echo 'if [ -n "$DATABASE_URL" ] && [ -d /app/prisma/migrations ]; then' >> /app/start-railway.sh && \
    echo '  timeout 30 npx prisma migrate deploy 2>&1 || echo "[db] Migration skipped"' >> /app/start-railway.sh && \
    echo 'fi' >> /app/start-railway.sh && \
    echo 'echo "[start] Launching: node index.js"' >> /app/start-railway.sh && \
    echo 'exec node index.js' >> /app/start-railway.sh && \
    chmod +x /app/start-railway.sh

ENTRYPOINT ["dumb-init","/app/start-railway.sh"]

ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080

CMD ["/app/start-railway.sh"]
