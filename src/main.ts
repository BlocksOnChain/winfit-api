import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import * as compression from 'compression';
import { AppModule } from './app.module';
import { AchievementsService } from './achievements/achievements.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Security
  app.use(helmet());
  app.use(compression());

  // CORS
  app.enableCors({
    origin: process.env.NODE_ENV === 'production' ? false : true,
    credentials: true,
  });

  // Global prefix
  app.setGlobalPrefix('api/v1');

  // Validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Swagger documentation
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('WinFit API')
      .setDescription(`
# WinFit Fitness Tracking API

## Overview
Comprehensive REST API for fitness tracking mobile applications built with React Native Expo TypeScript.

## Key Features
- **Complete Authentication System**: JWT-based auth with refresh tokens, email verification, and password reset
- **Health Data Management**: Sync and track steps, distance, calories, and other health metrics
- **Challenge System**: Individual and group challenges with automatic progress tracking
- **Social Features**: Friends system, leaderboards, and social challenges
- **Achievements & Rewards**: Gamification with unlockable achievements and point-based rewards
- **Real-time Notifications**: Push notifications for mobile apps via Firebase FCM
- **File Upload System**: Avatar and image uploads with AWS S3 integration

## Integration Guide
For detailed React Native Expo TypeScript integration instructions, see the API Integration Guide.

## Authentication Flow
1. **Register/Login**: Get access token and refresh token
2. **Token Management**: Automatic refresh with interceptors
3. **Protected Routes**: Use Bearer token in Authorization header
4. **Logout**: Invalidate tokens on server

## Health Data Flow
1. **Sync Health Data**: POST /health/sync automatically updates challenge progress
2. **Real-time Updates**: Challenges, achievements, and leaderboards update automatically
3. **Background Processing**: Scheduled tasks handle data aggregation and notifications

## Response Format
All endpoints return consistent JSON responses:
\`\`\`json
{
  "success": boolean,
  "data": any,
  "message": string,
  "error": {
    "code": string,
    "message": string,
    "details": any
  }
}
\`\`\`

## Error Codes
- **VALIDATION_ERROR**: Input validation failed
- **UNAUTHORIZED**: Invalid or missing authentication
- **FORBIDDEN**: Insufficient permissions
- **NOT_FOUND**: Resource not found
- **SERVER_ERROR**: Internal server error
- **NETWORK_ERROR**: Connection or timeout issues

## Rate Limiting
- General API: 100 requests/minute per user
- Auth endpoints: 5 requests/minute per IP
- File uploads: 10 requests/minute per user

## Mobile Integration Notes
- Use request interceptors for automatic token refresh
- Implement offline queue for health data sync
- Cache responses for better performance
- Handle push notification registration
- Implement proper error handling with user-friendly messages
      `)
      .setVersion('1.0.0')
      .setContact(
        'WinFit API Support',
        'https://winfit-api.com/support',
        'support@winfit-api.com'
      )
      .setLicense(
        'MIT License',
        'https://opensource.org/licenses/MIT'
      )
      .addServer('http://localhost:3000/api/v1', 'Development Server')
      .addServer('https://api.winfit.app/v1', 'Production Server')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          name: 'Authorization',
          description: 'Enter JWT token',
          in: 'header',
        },
        'JWT-auth'
      )
      .addTag('Authentication', 'User registration, login, logout, and token management')
      .addTag('Users', 'User profile management and statistics')
      .addTag('Health Data', 'Sync and retrieve health metrics (steps, distance, calories)')
      .addTag('Challenges', 'Individual and group challenges with automatic progress tracking')
      .addTag('Leaderboard', 'Global, friends, and challenge-specific leaderboards')
      .addTag('Achievements', 'Unlockable achievements and progress tracking')
      .addTag('Friends', 'Social features: friend requests, friend challenges')
      .addTag('Rewards', 'Point-based reward system with redemption')
      .addTag('Notifications', 'Push notifications and in-app notifications')
      .addTag('Uploads', 'File upload system for avatars and images')
      .addTag('Admin', 'Administrative functions for content management')
      .build();

    const document = SwaggerModule.createDocument(app, config, {
      deepScanRoutes: true,
      operationIdFactory: (controllerKey: string, methodKey: string) => methodKey,
    });

    SwaggerModule.setup('api/docs', app, document, {
      customSiteTitle: 'WinFit API Documentation',
      customfavIcon: '/favicon.ico',
      customCss: `
        .topbar-wrapper img { content: url('/logo.png'); }
        .swagger-ui .topbar { background-color: #1a365d; }
        .swagger-ui .topbar .download-url-wrapper { display: none; }
      `,
      swaggerOptions: {
        persistAuthorization: true,
        displayRequestDuration: true,
        docExpansion: 'none',
        filter: true,
        showRequestHeaders: true,
        tryItOutEnabled: true,
      },
    });
  }

  // Seed initial data
  try {
    const achievementsService = app.get(AchievementsService);
    await achievementsService.seedInitialAchievements();
  } catch (error) {
    console.error('Error seeding initial achievements:', error);
  }

  const port = process.env.APP_PORT || 3000;
  await app.listen(port);

  console.log(`🚀 WinFit API is running on: http://localhost:${port}`);
  console.log(`📚 API Documentation: http://localhost:${port}/api/docs`);
  console.log(`📱 React Native Integration Guide: API-Integration-Guide.md`);
}

bootstrap();
