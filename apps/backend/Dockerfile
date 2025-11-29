# Build stage
FROM node:20-slim AS builder
WORKDIR /app

# Install openssl for Prisma
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Copy backend package files and prisma schema (paths relative to monorepo root)
COPY apps/backend/package.json ./
COPY apps/backend/prisma ./prisma/

# Install dependencies
RUN npm install

# Generate Prisma client
RUN npx prisma generate

# Copy backend source code
COPY apps/backend/ .

# Build NestJS
RUN npm run build

# Production stage
FROM node:20-slim AS production
WORKDIR /app

RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Copy built files
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/prisma ./prisma

ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

# Start script: migrate and run
CMD npx prisma migrate deploy && node dist/main.js
