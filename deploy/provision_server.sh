#!/bin/bash
set -e

echo "🚀 Starting server provisioning..."

# 1. Update System
echo "📦 Updating system packages..."
sudo apt update && sudo apt upgrade -y

# 2. Install Docker & Docker Compose
if ! command -v docker &> /dev/null; then
    echo "🐳 Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    rm get-docker.sh
    # Add current user to docker group
    sudo usermod -aG docker $USER
    echo "✅ Docker installed."
else
    echo "✅ Docker already installed."
fi

# 3. Install Git
echo "🛠 Installing Git..."
sudo apt install -y git

# 4. Install Caddy (for HTTPS)
if ! command -v caddy &> /dev/null; then
    echo "🔒 Installing Caddy..."
    sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
    curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
    curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
    sudo apt update && sudo apt install caddy
    echo "✅ Caddy installed."
fi

echo "🎉 Provisioning complete! Please logout and log back in to apply Docker group changes."
