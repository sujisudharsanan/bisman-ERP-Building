FROM node:20-alpine
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build --workspace=api || true
ENV NODE_ENV=production
CMD ["node", "dist/apps/api/main.js"]
