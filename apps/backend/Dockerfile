# 1. Base Stage
FROM node:20-slim AS base
WORKDIR /usr/src/app
RUN apt-get update && apt-get install -y openssl
RUN npm install -g pnpm

# 2. Pruning Stage (for production dependencies)
FROM base AS pruner
ENV CI=true
COPY . .
RUN pnpm install --prod
RUN pnpm prune --prod

# 3. Build Stage
FROM base AS build
ENV CI=true
COPY . .
RUN pnpm install --no-frozen-lockfile
RUN pnpm --filter backend exec prisma generate
RUN pnpm --filter backend build
# Diagnóstico: Listar el contenido de la carpeta dist
RUN ls -R apps/backend/dist

# 4. Final Production Stage - Simplified to avoid bcrypt issues
FROM base AS production
ENV NODE_ENV=production

# Copy everything from build stage
COPY --from=build /usr/src/app /usr/src/app

WORKDIR /usr/src/app/apps/backend
CMD ["node", "dist/src/main.js"]
