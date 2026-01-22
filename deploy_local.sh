#!/bin/bash

# Configuration
SERVER_USER="ubuntu"
SERVER_IP="REPLACE_WITH_YOUR_SERVER_IP"
DEPLOY_DIR="~/avith-deploy"

echo "🚀 Starting Deployment Process..."

# 1. Build Docker images
echo "🏗️ Building WEB image..."
# Use the API URL provided in the script configuration or prompt for it
if [ -z "$API_URL" ]; then
    API_URL="https://api.avith.app" # Default or replace with your actual URL
fi

docker build --platform linux/amd64 -t avith-web \
    --build-arg APP_NAME=@avith/web \
    --build-arg NEXT_PUBLIC_API_URL=$API_URL .

echo "🏗️ Building API image..."
docker build --platform linux/amd64 -t avith-api --build-arg APP_NAME=@avith/api .

# 2. Save and Compress
echo "📦 Compressing images (this may take a minute)..."
docker save avith-web | gzip > deploy/avith-web.tar.gz
docker save avith-api | gzip > deploy/avith-api.tar.gz

# 3. Copy files to server
echo "📤 Transferring files to $SERVER_IP..."
scp deploy/avith-web.tar.gz \
    deploy/avith-api.tar.gz \
    deploy/docker-compose.yml \
    deploy/start.sh \
    $SERVER_USER@$SERVER_IP:$DEPLOY_DIR/

# 4. Restart services on server
echo "🔄 Restarting services on server..."
ssh $SERVER_USER@$SERVER_IP "cd $DEPLOY_DIR && chmod +x start.sh && ./start.sh"

echo "✅ Deployment Complete!"
