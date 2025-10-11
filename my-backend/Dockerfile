FROM node:18-alpine

WORKDIR /app

# Install dependencies first (better layer caching)
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy source
COPY . .

# Generate Prisma client if schema exists (non-fatal if missing)
RUN if [ -d "prisma" ]; then npx prisma generate || true; fi

ENV NODE_ENV=production
ENV PORT=3001
EXPOSE 3001

CMD ["node", "index.js"]
FROM node:18

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
COPY package*.json ./
RUN npm install --no-audit --no-fund

# Bundle app source
COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"]
