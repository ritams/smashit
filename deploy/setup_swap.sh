#!/bin/bash

# Check if swap already exists
if swapon --show | grep -q "/swapfile"; then
    echo "Swap file already exists. Skipping..."
    exit 0
fi

echo "Creating 4GB Swap File..."
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

echo "Making swap permanent..."
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

echo "Swap created successfully!"
free -h
