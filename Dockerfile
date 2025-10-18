## Root Dockerfile for Railway (backend service)
FROM node:18-alpine

# Minimal utilities for production containers
RUN apk add --no-cache dumb-init postgresql-client wget openssl libc6-compat

WORKDIR /app

# 1) Copy only package manifests for caching
COPY my-backend/package*.json ./

# 2) Copy Prisma schema BEFORE installing deps, so scripts can find it if needed
COPY my-backend/prisma ./prisma/

# 3) Install all deps, skipping lifecycle scripts so prisma CLI (devDependency) is available
RUN npm ci --ignore-scripts && npm cache clean --force

# 4) Copy the remainder of the backend source
COPY my-backend/ ./

# 5) Generate Prisma Client explicitly
RUN npx prisma generate && npm prune --omit=dev

ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080

# Use server.js wrapper (already present in my-backend/) and dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server.js"]
