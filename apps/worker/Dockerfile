FROM node:20-alpine
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build --workspace=worker || true
ENV NODE_ENV=production
CMD ["node", "dist/apps/worker/worker.js"]
