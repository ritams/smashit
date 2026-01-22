#!/bin/bash
set -e

echo "🚀 Starting deployment..."

# 1. Pull latest code
echo "📥 Pulling latest code from git..."
git pull origin main

# 2. Rebuild and restart containers
echo "🔄 Rebuilding and restarting containers..."
docker compose --env-file .env -f deploy/docker-compose.server.yml up -d --build --remove-orphans

# 3. Run migrations
echo "🗄 Running database migrations..."
docker compose --env-file .env -f deploy/docker-compose.server.yml exec api npx prisma migrate deploy

# 4. Prune unused images (optional, to save space)
echo "🧹 Cleaning up old images..."
docker image prune -f

echo "✅ App deployed successfully!"
