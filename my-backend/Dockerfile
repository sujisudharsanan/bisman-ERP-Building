## Backend Dockerfile (Railway compatible)
# Use lightweight Alpine and install minimal tools
## Multi-stage Dockerfile for my-backend

# ---- deps: install full deps, generate Prisma, then prune ----
FROM node:18-alpine AS deps
WORKDIR /app
RUN apk add --no-cache postgresql-client openssl libc6-compat
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci --ignore-scripts && npm cache clean --force
COPY . .
RUN npx prisma generate && npm prune --omit=dev

# ---- runner: minimal runtime with dumb-init ----
FROM node:18-alpine AS runner
RUN apk add --no-cache dumb-init
WORKDIR /app
COPY --from=deps /app /app

ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080

CMD ["dumb-init", "node", "server.js"]
