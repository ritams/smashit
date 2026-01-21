#!/bin/bash

# Configuration
SERVER_USER="ubuntu"
SERVER_IP="REPLACE_WITH_YOUR_SERVER_IP"
DEPLOY_DIR="~/smashit-deploy"

echo "🚀 Starting Deployment Process..."

# 1. Build Docker images
echo "🏗️ Building WEB image..."
docker build --platform linux/amd64 -t smashit-web --build-arg APP_NAME=@smashit/web .

echo "🏗️ Building API image..."
docker build --platform linux/amd64 -t smashit-api --build-arg APP_NAME=@smashit/api .

# 2. Save and Compress
echo "📦 Compressing images (this may take a minute)..."
docker save smashit-web | gzip > deploy/smashit-web.tar.gz
docker save smashit-api | gzip > deploy/smashit-api.tar.gz

# 3. Copy files to server
echo "📤 Transferring files to $SERVER_IP..."
scp deploy/smashit-web.tar.gz \
    deploy/smashit-api.tar.gz \
    deploy/docker-compose.yml \
    deploy/start.sh \
    $SERVER_USER@$SERVER_IP:$DEPLOY_DIR/

# 4. Restart services on server
echo "🔄 Restarting services on server..."
ssh $SERVER_USER@$SERVER_IP "cd $DEPLOY_DIR && chmod +x start.sh && ./start.sh"

echo "✅ Deployment Complete!"
