FROM node:20-alpine AS builder

WORKDIR /app

RUN apk add --no-cache openssl

COPY package.json ./
RUN npm install

COPY . .

RUN npx prisma generate
RUN npm run build


FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

RUN apk add --no-cache openssl netcat-openbsd

COPY package.json ./
RUN npm install --omit=dev

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

EXPOSE 3001

CMD ["sh", "-c", "node dist/server.js & SERVER_PID=$!; sleep 3; wget -qO- http://127.0.0.1:${PORT:-3001}/healthz || echo 'HEALTH CHECK FAILED'; wait $SERVER_PID"]
# CMD ["sh", "-c", "node dist/server.js & SERVER_PID=$!; echo 'Waiting for Fastify to become ready...'; until nc -z 127.0.0.1 ${PORT:-3001}; do sleep 1; done; echo 'Fastify is ready. Starting click-log worker...'; npm run worker:clicklog:start & WORKER_PID=$!; wait $SERVER_PID $WORKER_PID"]