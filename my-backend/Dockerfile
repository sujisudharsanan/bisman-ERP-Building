FROM node:20-alpine

# Force rebuild: 2025-11-30-v1
WORKDIR /app

# Install dependencies for Prisma
RUN apk add --no-cache openssl libc6-compat

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --ignore-scripts

# Copy prisma and generate client
COPY prisma ./prisma/
RUN npx prisma generate

# Copy source code
COPY . ./

# Environment
ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

# Start the server
CMD ["node", "index.js"]
