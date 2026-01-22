FROM node:20-alpine AS builder

RUN apk add --no-cache libc6-compat
WORKDIR /app

# Enable pnpm
RUN corepack enable

# Copy only the files needed for installation first for caching
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY packages/database/package.json ./packages/database/
COPY packages/types/package.json ./packages/types/
COPY packages/validators/package.json ./packages/validators/

# Install dependencies (all of them since we are in a monolith-like context now)
RUN pnpm install --frozen-lockfile

# Copy the rest of the source
COPY . .

# Generate Prisma client
RUN pnpm turbo db:generate

# Build the apps
ARG APP_NAME
RUN pnpm turbo build --filter=${APP_NAME}...

# RUNNER STAGE
FROM node:20-alpine AS runner
WORKDIR /app

# Enable pnpm in runner
RUN corepack enable

ARG APP_NAME
ENV APP_NAME=${APP_NAME}

# Copy build artifacts and dependencies
COPY --from=builder /app ./

EXPOSE 3000
EXPOSE 4000

# Start script
CMD if [ "$APP_NAME" = "@avith/web" ]; then \
      node apps/web/server.js || pnpm --filter=@avith/web start; \
    else \
      node apps/api/dist/index.js; \
    fi
