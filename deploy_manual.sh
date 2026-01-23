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

# Clean previous builds and cache
echo "🧹 Cleaning previous builds..."
rm -rf dist
rm -rf apps/*/dist
rm -rf packages/*/dist
rm -rf .turbo
rm -rf node_modules/.cache

# Build application
echo "🏗️  Building application..."
pnpm turbo build --force

# Reload PM2
echo "🔄 Reloading PM2..."
pm2 reload ecosystem.config.js --env production

echo "✅ Deployment complete!"
