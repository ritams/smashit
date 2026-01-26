#!/bin/bash

# Exit on error
set -e
export NODE_ENV=development

echo "🚀 Starting deployment..."

# Pull latest changes
echo "📥 Pulling latest changes..."
git pull origin main

# Install dependencies
echo "📦 Installing dependencies..."
pnpm install --frozen-lockfile

# Generate Database Client & Sync Schema Safely
echo "🗄️  Generating Database Client & Deploying Migrations..."
pnpm db:generate
# Baseline the initial migration for existing production database
echo "⚖️  Baselining initial migration..."
pnpm --filter @avith/database exec prisma migrate resolve --applied 20260117122541_add_user_profile_fields || echo "Baseline skipped or already applied"

pnpm --filter @avith/database exec prisma migrate deploy

# Run data migration script (backfill Facility IDs)
echo "📦 Running data migration..."
pnpm --filter @avith/database exec tsx ../../scripts/prod-migration-v1.ts



# Clean previous builds and cache
echo "🧹 Cleaning previous builds..."
rm -rf dist
rm -rf apps/*/dist
rm -rf apps/*/tsconfig.tsbuildinfo
rm -rf packages/*/dist
rm -rf packages/*/tsconfig.tsbuildinfo
rm -rf .turbo
rm -rf node_modules/.cache

# Build application
echo "🏗️  Building application..."
pnpm turbo build --force

# Copy static assets for Next.js standalone build
echo "📋 Copying static assets..."
cp -r apps/web/.next/static apps/web/.next/standalone/apps/web/.next/

# Reload PM2
echo "🔄 Reloading PM2..."
pm2 reload ecosystem.config.js --env production

echo "✅ Deployment complete!"
