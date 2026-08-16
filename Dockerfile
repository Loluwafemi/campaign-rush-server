# =========================
# Build stage
# =========================
FROM node:20-alpine AS builder

WORKDIR /app

# Prisma requires OpenSSL
RUN apk add --no-cache openssl

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy application source
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build TypeScript
RUN npm run build


# =========================
# Production stage
# =========================
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Prisma requires OpenSSL at runtime too
RUN apk add --no-cache openssl

# Install production dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy compiled application
COPY --from=builder /app/dist ./dist

# Copy Prisma schema/migrations
COPY --from=builder /app/prisma ./prisma

# Copy generated Prisma Client
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Railway provides the PORT environment variable
EXPOSE 3001

CMD ["node", "dist/server.js"]