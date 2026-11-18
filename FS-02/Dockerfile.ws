FROM node:20-alpine AS runner
WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY prisma ./prisma
RUN npx prisma generate

COPY server ./server
COPY tsconfig.json ./

ENV NODE_ENV=production
ENV PORT=1234

EXPOSE 1234

CMD ["npx", "tsx", "server/websocket-server.ts"]
