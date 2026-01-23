#!/bin/bash

# Exit on error
set -e

echo "🚀 Starting deployment..."

# Pull latest changes
echo "📥 Pulling latest changes..."
git pull origin main

# Install dependencies
echo "📦 Installing dependencies..."
pnpm install --frozen-lockfile

# Generate Database Client (managed by Turbo usually, but good to be explicit/safe)
echo "🗄️  Generating Database Client..."
pnpm db:generate

# Build application
echo "🏗️  Building application..."
pnpm turbo build --force

# Reload PM2
echo "🔄 Reloading PM2..."
pm2 reload ecosystem.config.js --env production

echo "✅ Deployment complete!"
