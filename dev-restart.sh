#!/bin/bash

echo "🧹 Cleaning up development containers..."

# Stop and remove containers
docker-compose -f docker-compose.dev.yml down

# Remove the dist volume to ensure clean start
docker volume rm winfit-api_winfit_dist_dev 2>/dev/null || true

# Remove any local dist directory that might cause conflicts
rm -rf dist

echo "🚀 Starting development containers..."

# Start containers
docker-compose -f docker-compose.dev.yml up --build

echo "✅ Development environment restarted!" 