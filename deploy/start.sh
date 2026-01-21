#!/bin/bash

echo "Loading new images..."
if [ -f "smashit-web.tar.gz" ]; then
    gunzip -c smashit-web.tar.gz | docker load
fi
if [ -f "smashit-api.tar.gz" ]; then
    gunzip -c smashit-api.tar.gz | docker load
fi

echo "Starting services..."
docker compose up -d postgres redis
echo "Waiting for database..."
sleep 5
echo "Running migrations..."
docker compose run --rm api npx prisma migrate deploy

echo "Starting app services..."
docker compose up -d web api

echo "Cleaning up..."
docker image prune -f
