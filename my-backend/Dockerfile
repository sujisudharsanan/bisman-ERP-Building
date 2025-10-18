## Backend Dockerfile (Railway compatible)
# Use lightweight Alpine and install minimal tools
FROM node:18-alpine

# Install runtime tools (dumb-init for signal handling, psql client for debug, wget for health/debug)
RUN apk add --no-cache dumb-init postgresql-client wget openssl libc6-compat

# Workdir inside the container
WORKDIR /app

# 1) Copy only package manifests for better caching
COPY package*.json ./

# 2) Copy Prisma schema BEFORE installing deps so postinstall (if enabled) can find it
COPY prisma ./prisma/

# 3) Install all deps but skip lifecycle scripts so postinstall doesn't run yet
#    This ensures `prisma` CLI (a devDependency) is available for generate
RUN npm ci --ignore-scripts && npm cache clean --force

# 4) Copy the rest of the backend source
COPY . .

# 5) Generate Prisma Client explicitly (schema is already in /app/prisma)
RUN npx prisma generate

# 6) Prune devDependencies to slim the final image
RUN npm prune --omit=dev

# 7) Environment and port
ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080

# 8) Start the server via dumb-init
CMD ["dumb-init", "node", "server.js"]
