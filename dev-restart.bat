@echo off
echo 🧹 Cleaning up development containers...

REM Stop and remove containers
docker-compose -f docker-compose.dev.yml down

REM Remove the dist volume to ensure clean start
docker volume rm winfit-api_winfit_dist_dev 2>nul

REM Remove any local dist directory that might cause conflicts
if exist dist rmdir /s /q dist

echo 🚀 Starting development containers...

REM Start containers
docker-compose -f docker-compose.dev.yml up --build

echo ✅ Development environment restarted! 