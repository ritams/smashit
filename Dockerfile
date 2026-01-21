FROM node:18-alpine AS base

# 1. Prune step
FROM base AS pruner
RUN apk add --no-cache libc6-compat
WORKDIR /app
RUN npm install turbo --global
COPY . .
# We prune for both apps or pass it as an argument later
# For simplicity in local build, we'll prune based on a build arg
ARG APP_NAME
RUN turbo prune ${APP_NAME} --docker

# 2. Installer step
FROM base AS installer
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY .gitignore .gitignore
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml

RUN corepack enable
RUN pnpm install

# 3. Builder step
FROM base AS builder
WORKDIR /app
RUN apk add --no-cache libc6-compat
RUN corepack enable

COPY --from=installer /app/ .
COPY --from=pruner /app/out/full/ .
COPY turbo.json turbo.json

# Generate Prisma Client
RUN pnpm turbo db:generate

# Build the project
ARG APP_NAME
RUN pnpm turbo build --filter=${APP_NAME}...

# 4. Runner step
FROM base AS runner
WORKDIR /app

ARG APP_NAME
ENV APP_NAME=${APP_NAME}

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
USER nextjs

# Conditional copying based on app type
# This is a bit tricky in one Dockerfile runner stage, 
# so we use a simple script or just copy everything needed for both.
# Alternatively, we can use different stages for runner if needed.
# For now, let's assume we build separate images.

# ... (previous stages same)
# NEXT.JS STANDALONE (Web)
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./web-standalone
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./web-standalone/apps/web/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/public ./web-standalone/apps/web/public

# API (Express)
# We need node_modules for the API. We can copy them from the builder stage.
# In a monorepo, they are usually in the root or the app's node_modules.
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=builder --chown=nextjs:nodejs /app/apps/api/dist ./apps/api/dist
COPY --from=builder --chown=nextjs:nodejs /app/apps/api/package.json ./apps/api/package.json
COPY --from=builder --chown=nextjs:nodejs /app/packages/database ./packages/database

EXPOSE 3000
EXPOSE 4000

# Start command depends on APP_NAME
CMD if [ "$APP_NAME" = "@smashit/web" ]; then \
      node web-standalone/apps/web/server.js; \
    else \
      node apps/api/dist/index.js; \
    fi
