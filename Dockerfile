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
RUN npm run build --prefix frontend && npm run export --prefix frontend

# ---- runner: minimal runtime with dumb-init; copy pruned node_modules later ----
FROM node:18-alpine AS runner
RUN apk add --no-cache dumb-init
WORKDIR /app

# Copy backend app and node_modules
COPY --from=deps /app /app

# Copy exported frontend into backend directory structure expected by server.js
COPY --from=build-frontend /app/frontend/out /app/frontend/out

ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server.js"]
