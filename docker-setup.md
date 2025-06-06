# WinFit API Docker Setup Guide

## Overview
This guide provides instructions for dockerizing and deploying the WinFit NestJS API with PostgreSQL and Redis using Docker Compose for both development and production environments.

## Files Created
- `Dockerfile` - Multi-stage Docker build for NestJS API
- `docker-compose.dev.yml` - Development environment
- `docker-compose.prod.yml` - Production environment
- `.dockerignore` - Optimize Docker build context

## Prerequisites
- Docker and Docker Compose installed
- Git repository cloned
- Environment variables configured

## Development Environment

### Quick Start
```bash
# Run development environment
docker-compose -f docker-compose.dev.yml up --build

# Run in background
docker-compose -f docker-compose.dev.yml up -d --build

# View logs
docker-compose -f docker-compose.dev.yml logs -f

# Stop services
docker-compose -f docker-compose.dev.yml down
```

### Development Features
- Hot reload with volume mounts
- Debug port exposed (9229)
- Swagger documentation enabled
- Permissive CORS settings
- Auto-seed achievements
- Development-friendly rate limits

### Access Points
- API: http://localhost:3000
- API Documentation: http://localhost:3000/api/docs
- PostgreSQL: localhost:5432
- Redis: localhost:6379

## Production Environment

### 1. Create Secrets Directory
```bash
mkdir -p secrets
```

### 2. Create Secret Files
```bash
# PostgreSQL password
echo "your-strong-postgres-password" > secrets/postgres_password.txt

# JWT secret (minimum 32 characters)
echo "your-production-jwt-secret-key-minimum-32-characters-long" > secrets/jwt_secret.txt

# JWT refresh secret (minimum 32 characters)
echo "your-production-jwt-refresh-secret-key-minimum-32-characters-long" > secrets/jwt_refresh_secret.txt
```

### 3. Create Production Environment File
Create `.env.prod` with the following variables:
```bash
# Application
APP_URL=https://api.yourdomain.com
CORS_ORIGIN=https://yourdomain.com,https://app.yourdomain.com

# Redis
REDIS_PASSWORD=your-strong-redis-password

# Email
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-email-app-password
EMAIL_FROM_NAME=WinFit Team
EMAIL_FROM_ADDRESS=noreply@yourdomain.com

# AWS S3
AWS_ACCESS_KEY_ID=your-access-key-id
AWS_SECRET_ACCESS_KEY=your-secret-access-key
AWS_REGION=us-east-1
AWS_S3_BUCKET=winfit-uploads-prod
AWS_CLOUDFRONT_DOMAIN=your-cloudfront-domain.cloudfront.net

# Firebase FCM
FCM_SERVICE_ACCOUNT={"type":"service_account","project_id":"your-project-id",...}
```

### 4. Deploy Production
```bash
# Load environment variables and deploy
docker-compose -f docker-compose.prod.yml --env-file .env.prod up -d --build

# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Stop services
docker-compose -f docker-compose.prod.yml down
```

### Production Features
- Multi-stage optimized builds
- Resource limits and reservations
- Health checks and restart policies
- Security-hardened settings
- Log rotation
- Docker secrets for sensitive data
- Optional Nginx reverse proxy

## Database Management

### Run Migrations
```bash
# Development
docker-compose -f docker-compose.dev.yml exec api npm run migration:run

# Production
docker-compose -f docker-compose.prod.yml exec api npm run migration:run
```

### Database Backup (Production)
```bash
# Create backup
docker-compose -f docker-compose.prod.yml exec postgres pg_dump -U postgres winfit > backup.sql

# Restore backup
docker-compose -f docker-compose.prod.yml exec -T postgres psql -U postgres winfit < backup.sql
```

## Monitoring and Debugging

### View Container Status
```bash
# Development
docker-compose -f docker-compose.dev.yml ps

# Production
docker-compose -f docker-compose.prod.yml ps
```

### Execute Commands in Containers
```bash
# Access API container
docker-compose -f docker-compose.dev.yml exec api sh

# Access PostgreSQL
docker-compose -f docker-compose.dev.yml exec postgres psql -U postgres -d winfit

# Access Redis
docker-compose -f docker-compose.dev.yml exec redis redis-cli
```

### Health Checks
```bash
# Check API health
curl http://localhost:3000/api/v1/health

# Check container health status
docker-compose -f docker-compose.dev.yml ps
```

## Nginx Configuration (Production)

If using the Nginx service, create `nginx.conf`:
```nginx
events {
    worker_connections 1024;
}

http {
    upstream api {
        server api:3000;
    }

    server {
        listen 80;
        server_name yourdomain.com;
        return 301 https://$server_name$request_uri;
    }

    server {
        listen 443 ssl http2;
        server_name yourdomain.com;

        ssl_certificate /etc/nginx/ssl/cert.pem;
        ssl_certificate_key /etc/nginx/ssl/key.pem;

        location / {
            proxy_pass http://api;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
}
```

## Troubleshooting

### Common Issues

1. **Port conflicts**: Change ports in docker-compose files if 3000, 5432, or 6379 are in use
2. **Permission errors**: Ensure Docker has proper permissions
3. **Memory issues**: Increase Docker memory limits in Docker Desktop
4. **Build failures**: Clear Docker cache with `docker system prune -a`

### Reset Everything
```bash
# Stop all containers and remove volumes
docker-compose -f docker-compose.dev.yml down -v
docker-compose -f docker-compose.prod.yml down -v

# Remove all winfit images
docker images | grep winfit | awk '{print $3}' | xargs docker rmi

# Rebuild from scratch
docker-compose -f docker-compose.dev.yml up --build
```

## Security Considerations

### Production Security Checklist
- [ ] Use strong passwords for all services
- [ ] Configure proper CORS origins
- [ ] Enable SSL/TLS certificates
- [ ] Use Docker secrets for sensitive data
- [ ] Regularly update base images
- [ ] Monitor container logs
- [ ] Implement network security rules
- [ ] Use non-root users in containers

### Environment Variables
Never commit production environment files or secrets to version control. Use:
- `.env.prod` for production variables
- `secrets/` directory for sensitive data
- Environment variable injection in CI/CD

## Performance Optimization

### Production Optimizations
- Multi-stage Docker builds
- Alpine Linux base images
- Proper resource limits
- Connection pooling
- Redis caching
- Compression middleware
- Log rotation

### Scaling
For horizontal scaling, consider:
- Load balancer (Nginx, HAProxy)
- Multiple API replicas
- Database read replicas
- Redis clustering
- Container orchestration (Kubernetes)

## Maintenance

### Regular Tasks
- Monitor container health
- Check disk space
- Update dependencies
- Backup databases
- Review logs for errors
- Update security patches

### Updates
```bash
# Update images
docker-compose -f docker-compose.prod.yml pull

# Rebuild and restart
docker-compose -f docker-compose.prod.yml up -d --build
``` 