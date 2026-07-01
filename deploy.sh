#!/bin/sh
set -e

echo "==> Pulling latest code..."
git pull

echo "==> Building and starting services..."
docker compose up --build -d

echo "==> Pruning old images..."
docker image prune -f

echo ""
echo "==> Done."
docker compose ps
