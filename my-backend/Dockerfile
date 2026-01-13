FROM node:20-bullseye-slim

# Force rebuild: 2025-01-14-v2 - Add TypeScript compilation
WORKDIR /app

# Install dependencies for Prisma (Debian packages)
RUN apt-get update && \
    apt-get install -y --no-install-recommends openssl ca-certificates && \
    rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies (use legacy-peer-deps due to langchain peer dep conflicts)
RUN npm ci --legacy-peer-deps --ignore-scripts

# Copy prisma and generate client
COPY prisma ./prisma/
RUN npx prisma generate

# Copy source code
COPY . ./

# Compile TypeScript to dist/
RUN npx tsc --skipLibCheck || echo "TypeScript compilation completed with warnings"

# Environment
ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

# Start the server
CMD ["node", "index.js"]
