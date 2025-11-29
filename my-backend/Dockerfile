# Backend Dockerfile for Railway
# BUILD_VERSION: 2025-11-29-simplified

FROM node:20-alpine
WORKDIR /app

# Install system dependencies
RUN apk add --no-cache postgresql-client openssl libc6-compat dumb-init

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --ignore-scripts && npm cache clean --force

# Copy prisma schema and generate client
COPY prisma ./prisma/
RUN npx prisma generate

# Copy rest of the source
COPY . ./

# Set environment
ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

# Start command
CMD ["sh", "-c", "npx prisma migrate deploy || true; node index.js"]
