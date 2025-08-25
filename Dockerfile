FROM node:22-alpine AS base

WORKDIR /app

COPY package*.json ./

RUN npm ci --omit=dev

COPY . .

RUN mkdir -p /app/uploads && chown -R node:node /app

ENV NODE_ENV=production \
    PORT=3000

EXPOSE 3000

USER node

CMD ["node", "server.js"]
