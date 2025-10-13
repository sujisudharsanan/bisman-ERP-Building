# Backend Dockerfile for Render (Docker runtime)
# Uses Debian slim to avoid OpenSSL issues with Prisma on Alpine
FROM node:18-bullseye-slim

# Set workdir
WORKDIR /app

# Install system deps (optional: ca-certificates, openssl for Prisma engines)
RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    ca-certificates openssl \
  && rm -rf /var/lib/apt/lists/*

# Install dependencies first (better layer caching)
COPY package*.json ./
# Install all deps but skip lifecycle scripts (postinstall runs prisma generate which needs schema)
RUN npm ci --ignore-scripts

# Copy Prisma schema now and generate client explicitly
COPY prisma ./prisma
RUN npx prisma generate

# Copy the rest of the source code
COPY . .

# Remove devDependencies to slim the image
RUN npm prune --omit=dev

# Environment
ENV NODE_ENV=production
# Render sets PORT; default fallback
ENV PORT=10000
EXPOSE 10000

# Start the server
CMD ["node", "index.js"]
