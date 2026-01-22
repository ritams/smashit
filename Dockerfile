FROM node:20-alpine AS base

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
COPY tsconfig.base.json tsconfig.base.json

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
# Selective copying based on APP_NAME using a bind mount
RUN --mount=type=bind,from=builder,source=/app,target=/builder \
    if [ "$APP_NAME" = "@avith/web" ]; then \
        cp -r /builder/apps/web/.next/standalone ./web-standalone && \
        cp -r /builder/apps/web/.next/static ./web-standalone/apps/web/.next/static && \
        if [ -d "/builder/apps/web/public" ]; then \
            cp -r /builder/apps/web/public ./web-standalone/apps/web/public; \
        fi; \
    else \
        cp -r /builder/node_modules ./node_modules && \
        cp -r /builder/apps/api/node_modules ./apps/api/node_modules && \
        cp -r /builder/apps/api/dist ./apps/api/dist && \
        cp -r /builder/apps/api/package.json ./apps/api/package.json && \
        cp -r /builder/packages/database ./packages/database; \
    fi && \
    chown -R nextjs:nodejs .

USER nextjs

EXPOSE 3000
EXPOSE 4000

# Start command depends on APP_NAME
CMD if [ "$APP_NAME" = "@avith/web" ]; then \
      node web-standalone/apps/web/server.js; \
    else \
      node apps/api/dist/index.js; \
    fi
