FROM node:20-alpine
WORKDIR /app
RUN apk add --no-cache openssl libc6-compat
COPY package*.json ./
RUN npm ci --ignore-scripts
COPY prisma ./prisma/
RUN npx prisma generate
COPY . ./
ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "index.js"]
