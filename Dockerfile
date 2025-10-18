## Root Dockerfile for Railway (backend service)
## Multi-stage Dockerfile (root) to build my-backend efficiently

# ---- deps: install with dev deps for prisma CLI and generate client ----
FROM node:18-alpine AS deps
WORKDIR /app
RUN apk add --no-cache postgresql-client openssl libc6-compat
COPY my-backend/package*.json ./
COPY my-backend/prisma ./prisma/
RUN npm ci --ignore-scripts && npm cache clean --force
COPY my-backend/ ./
RUN npx prisma generate && npm prune --omit=dev

# ---- runner: tiny runtime image with only what we need ----
FROM node:18-alpine AS runner
RUN apk add --no-cache dumb-init
WORKDIR /app
# Copy full app (already pruned) from deps stage
COPY --from=deps /app /app

ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server.js"]
