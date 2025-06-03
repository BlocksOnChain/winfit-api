# WinFit API Specification for NestJS TypeScript Backend

## Overview

This document outlines the complete API specification for the WinFit fitness tracking application backend. The API will be built using NestJS with TypeScript, providing endpoints for user authentication, health data management, challenges, leaderboards, social features, and more.

## Technology Stack

- **Framework**: NestJS (Node.js)
- **Language**: TypeScript
- **Database**: PostgreSQL with TypeORM
- **Authentication**: JWT (JSON Web Tokens)
- **File Storage**: AWS S3 or similar cloud storage
- **Cache**: Redis for sessions and leaderboards
- **Documentation**: Swagger/OpenAPI
- **Validation**: class-validator and class-transformer
- **Testing**: Jest with Supertest

## Challenge Progress Tracking

**Important Note:** Challenge progress is automatically tracked when users sync their health data via `POST /health/sync`. There is no manual progress update endpoint. This ensures data consistency and provides a seamless user experience where fitness activities automatically contribute to challenge goals.

## Project Structure

```
winfit-api/
├── src/
│   ├── auth/
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── auth.module.ts
│   │   ├── dto/
│   │   ├── guards/
│   │   └── strategies/
│   ├── users/
│   │   ├── users.controller.ts
│   │   ├── users.service.ts
│   │   ├── users.module.ts
│   │   ├── entities/
│   │   └── dto/
│   ├── challenges/
│   │   ├── challenges.controller.ts
│   │   ├── challenges.service.ts
│   │   ├── challenge-progress.service.ts
│   │   ├── challenge-automation.service.ts
│   │   ├── challenges.module.ts
│   │   ├── entities/
│   │   └── dto/
│   ├── leaderboard/
│   │   ├── leaderboard.controller.ts
│   │   ├── leaderboard.service.ts
│   │   ├── leaderboard.module.ts
│   │   └── dto/
│   ├── health/
│   │   ├── health.controller.ts
│   │   ├── health.service.ts
│   │   ├── health.module.ts
│   │   ├── entities/
│   │   └── dto/
│   ├── notifications/
│   │   ├── notifications.controller.ts
│   │   ├── notifications.service.ts
│   │   ├── notifications.module.ts
│   │   └── dto/
│   ├── rewards/
│   │   ├── rewards.controller.ts
│   │   ├── rewards.service.ts
│   │   ├── rewards.module.ts
│   │   ├── entities/
│   │   └── dto/
│   ├── friends/
│   │   ├── friends.controller.ts
│   │   ├── friends.service.ts
│   │   ├── friends.module.ts
│   │   └── dto/
│   ├── uploads/
│   │   ├── uploads.controller.ts
│   │   ├── uploads.service.ts
│   │   └── uploads.module.ts
│   ├── admin/
│   │   ├── admin.controller.ts
│   │   ├── admin.service.ts
│   │   └── admin.module.ts
│   ├── common/
│   │   ├── decorators/
│   │   ├── filters/
│   │   ├── guards/
│   │   ├── interceptors/
│   │   ├── pipes/
│   │   └── dto/
│   ├── database/
│   │   ├── migrations/
│   │   └── seeders/
│   ├── config/
│   │   ├── database.config.ts
│   │   ├── jwt.config.ts
│   │   ├── redis.config.ts
│   │   └── aws.config.ts
│   ├── app.module.ts
│   └── main.ts
├── package.json
├── tsconfig.json
├── nest-cli.json
├── docker-compose.yml
└── README.md
```

## Database Schema

### Users Table
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  avatar_url TEXT,
  date_of_birth DATE,
  gender VARCHAR(20),
  height_cm INTEGER,
  weight_kg DECIMAL(5,2),
  total_steps BIGINT DEFAULT 0,
  total_distance BIGINT DEFAULT 0, -- in meters
  level INTEGER DEFAULT 1,
  experience INTEGER DEFAULT 0,
  daily_step_goal INTEGER DEFAULT 10000,
  weekly_step_goal INTEGER DEFAULT 70000,
  timezone VARCHAR(50) DEFAULT 'UTC',
  is_active BOOLEAN DEFAULT true,
  is_premium BOOLEAN DEFAULT false,
  email_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Health Data Table
```sql
CREATE TABLE health_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  steps INTEGER DEFAULT 0,
  distance BIGINT DEFAULT 0, -- in meters
  calories_burned INTEGER DEFAULT 0,
  active_minutes INTEGER DEFAULT 0,
  floors_climbed INTEGER DEFAULT 0,
  heart_rate_avg INTEGER,
  sleep_hours DECIMAL(4,2),
  water_intake_ml INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, date)
);
```

### Challenges Table
```sql
CREATE TABLE challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  type VARCHAR(50) NOT NULL, -- 'Individual', 'Group', 'Friends'
  category VARCHAR(50) NOT NULL, -- 'Steps', 'Distance', 'Time'
  goal BIGINT NOT NULL, -- steps or distance in meters
  duration INTEGER NOT NULL, -- in days
  difficulty VARCHAR(20) NOT NULL, -- 'Easy', 'Medium', 'Hard'
  max_participants INTEGER,
  reward_type VARCHAR(50), -- 'Coupon', 'Badge', 'Points', 'Experience'
  reward_value TEXT,
  reward_description TEXT,
  reward_image_url TEXT,
  challenge_image_url TEXT,
  start_date TIMESTAMP NOT NULL,
  end_date TIMESTAMP NOT NULL,
  is_active BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### User Challenges Table
```sql
CREATE TABLE user_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  challenge_id UUID NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  current_progress BIGINT DEFAULT 0,
  is_completed BOOLEAN DEFAULT false,
  completion_percentage DECIMAL(5,2) DEFAULT 0,
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  rank INTEGER,
  points_earned INTEGER DEFAULT 0,
  UNIQUE(user_id, challenge_id)
);
```

### Challenge Progress Table
```sql
CREATE TABLE challenge_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_challenge_id UUID NOT NULL REFERENCES user_challenges(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  daily_steps INTEGER DEFAULT 0,
  daily_distance BIGINT DEFAULT 0,
  percentage DECIMAL(5,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_challenge_id, date)
);
```

### Achievements Table
```sql
CREATE TABLE achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  icon VARCHAR(255),
  category VARCHAR(50) NOT NULL, -- 'Steps', 'Distance', 'Challenges', 'Social'
  requirement_type VARCHAR(50), -- 'TOTAL_STEPS', 'DAILY_STEPS', 'CHALLENGES_COMPLETED'
  requirement_value BIGINT,
  points_reward INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### User Achievements Table
```sql
CREATE TABLE user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, achievement_id)
);
```

### Friends Table
```sql
CREATE TABLE friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  addressee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'PENDING', -- 'PENDING', 'ACCEPTED', 'DECLINED', 'BLOCKED'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(requester_id, addressee_id)
);
```

### Friend Challenges Table
```sql
CREATE TABLE friend_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenger_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  challenged_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  goal BIGINT NOT NULL,
  duration INTEGER NOT NULL, -- in days
  start_date TIMESTAMP NOT NULL,
  end_date TIMESTAMP NOT NULL,
  status VARCHAR(20) DEFAULT 'PENDING', -- 'PENDING', 'ACCEPTED', 'DECLINED', 'COMPLETED'
  winner_id UUID REFERENCES users(id),
  challenger_progress BIGINT DEFAULT 0,
  challenged_progress BIGINT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Notifications Table
```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50) NOT NULL, -- 'CHALLENGE', 'ACHIEVEMENT', 'FRIEND', 'SYSTEM'
  data JSONB, -- Additional data for the notification
  is_read BOOLEAN DEFAULT false,
  is_sent BOOLEAN DEFAULT false,
  scheduled_at TIMESTAMP,
  sent_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## API Endpoints

### Authentication Endpoints

#### POST /auth/register
Register a new user account.

**Request Body:**
```typescript
{
  email: string;
  username: string;
  password: string;
  firstName: string;
  lastName: string;
  dateOfBirth?: string; // ISO date
  gender?: 'Male' | 'Female' | 'Other';
  heightCm?: number;
  weightKg?: number;
}
```

**Response:**
```typescript
{
  success: boolean;
  message: string;
  data: {
    user: UserProfile;
    accessToken: string;
    refreshToken: string;
  };
}
```

#### POST /auth/login
Login with email and password.

**Request Body:**
```typescript
{
  email: string;
  password: string;
}
```

**Response:**
```typescript
{
  success: boolean;
  message: string;
  data: {
    user: UserProfile;
    accessToken: string;
    refreshToken: string;
  };
}
```

#### POST /auth/refresh
Refresh access token using refresh token.

**Request Body:**
```typescript
{
  refreshToken: string;
}
```

**Response:**
```typescript
{
  success: boolean;
  data: {
    accessToken: string;
    refreshToken: string;
  };
}
```

#### POST /auth/logout
Logout and invalidate tokens.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```typescript
{
  success: boolean;
  message: string;
}
```

#### POST /auth/forgot-password
Request password reset.

**Request Body:**
```typescript
{
  email: string;
}
```

#### POST /auth/reset-password
Reset password with token.

**Request Body:**
```typescript
{
  token: string;
  newPassword: string;
}
```

#### POST /auth/verify-email
Verify email address.

**Request Body:**
```typescript
{
  token: string;
}
```

### User Management Endpoints

#### GET /users/profile
Get current user profile.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```typescript
{
  success: boolean;
  data: UserProfile;
}
```

#### PUT /users/profile
Update user profile.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```typescript
{
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  gender?: string;
  heightCm?: number;
  weightKg?: number;
  dailyStepGoal?: number;
  weeklyStepGoal?: number;
  timezone?: string;
}
```

#### GET /users/stats
Get user statistics.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `period`: 'daily' | 'weekly' | 'monthly' | 'yearly'
- `startDate`: ISO date string
- `endDate`: ISO date string

**Response:**
```typescript
{
  success: boolean;
  data: {
    dailySteps: number;
    weeklySteps: number;
    monthlySteps: number;
    dailyDistance: number;
    weeklyDistance: number;
    monthlyDistance: number;
    activeDays: number;
    averageStepsPerDay: number;
    totalChallengesCompleted: number;
    currentStreak: number;
    longestStreak: number;
  };
}
```

#### GET /users/achievements
Get user achievements.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```typescript
{
  success: boolean;
  data: Achievement[];
}
```

#### GET /users/search
Search for users by username or name.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `q`: search query string
- `limit`: number (default: 20)
- `offset`: number (default: 0)

**Response:**
```typescript
{
  success: boolean;
  data: {
    users: User[];
    total: number;
  };
}
```

### Health Data Endpoints

#### POST /health/sync
Sync health data from device. **This endpoint automatically updates challenge progress for all active challenges.**

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```typescript
{
  date: string; // ISO date
  steps: number;
  distance: number; // in meters
  caloriesBurned?: number;
  activeMinutes?: number;
  floorsClimbed?: number;
  heartRateAvg?: number;
  sleepHours?: number;
  waterIntakeMl?: number;
}
```

**Response:**
```typescript
{
  success: boolean;
  data: HealthData;
  message: string;
}
```

**Note:** When health data is synced, the system automatically:
1. Updates progress for all active challenges the user is participating in
2. Recalculates completion percentages and rankings
3. Checks for challenge completions and awards points
4. Updates leaderboards in real-time

#### GET /health/data
Get health data for a period.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `startDate`: ISO date string
- `endDate`: ISO date string
- `aggregation`: 'daily' | 'weekly' | 'monthly'

**Response:**
```typescript
{
  success: boolean;
  data: HealthData[];
}
```

#### GET /health/summary
Get health summary statistics.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `period`: 'week' | 'month' | 'year'

**Response:**
```typescript
{
  success: boolean;
  data: {
    totalSteps: number;
    totalDistance: number;
    averageDailySteps: number;
    activeDays: number;
    bestDay: {
      date: string;
      steps: number;
    };
    trends: {
      stepsChange: number; // percentage change
      distanceChange: number;
    };
  };
}
```

### Challenge Endpoints

#### GET /challenges
Get available challenges.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `type`: 'Individual' | 'Group' | 'Friends'
- `category`: 'Steps' | 'Distance' | 'Time'
- `difficulty`: 'Easy' | 'Medium' | 'Hard'
- `status`: 'upcoming' | 'active' | 'completed'
- `featured`: boolean
- `limit`: number (default: 20)
- `offset`: number (default: 0)

**Response:**
```typescript
{
  success: boolean;
  data: {
    challenges: Challenge[];
    total: number;
  };
}
```

#### GET /challenges/:id
Get challenge details.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```typescript
{
  success: boolean;
  data: Challenge & {
    participants: number;
    userProgress?: ChallengeProgress;
    leaderboard: {
      rank: number;
      user: User;
      progress: number;
      percentage: number;
    }[];
  };
}
```

#### POST /challenges/:id/join
Join a challenge.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```typescript
{
  success: boolean;
  message: string;
  data: ChallengeProgress;
}
```

#### DELETE /challenges/:id/leave
Leave a challenge.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```typescript
{
  success: boolean;
  message: string;
}
```

#### GET /challenges/user
Get user's challenges.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `status`: 'active' | 'completed' | 'upcoming'

**Response:**
```typescript
{
  success: boolean;
  data: UserChallenge[];
}
```

#### POST /challenges/create
Create a new challenge (Admin only).

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```typescript
{
  title: string;
  description: string;
  type: 'Individual' | 'Group' | 'Friends';
  category: 'Steps' | 'Distance' | 'Time';
  goal: number;
  duration: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  maxParticipants?: number;
  rewardType: 'Coupon' | 'Badge' | 'Points' | 'Experience';
  rewardValue: string | number;
  rewardDescription: string;
  startDate: string; // ISO datetime
  endDate: string; // ISO datetime
  isFeatured?: boolean;
}
```

### Leaderboard Endpoints

#### GET /leaderboard
Get leaderboard data.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `type`: 'Global' | 'Friends' | 'Challenge'
- `period`: 'Daily' | 'Weekly' | 'Monthly' | 'AllTime'
- `challengeId`: string (required if type is 'Challenge')
- `limit`: number (default: 50)

**Response:**
```typescript
{
  success: boolean;
  data: {
    id: string;
    name: string;
    type: string;
    period: string;
    entries: LeaderboardEntry[];
    userRank?: number;
    totalParticipants: number;
    lastUpdated: string;
  };
}
```

#### GET /leaderboard/user-rank
Get user's current rank.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `type`: 'Global' | 'Friends'
- `period`: 'Daily' | 'Weekly' | 'Monthly'

**Response:**
```typescript
{
  success: boolean;
  data: {
    rank: number;
    totalParticipants: number;
    score: number;
    change: number; // position change
  };
}
```

### Friends Endpoints

#### GET /friends
Get user's friends list.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```typescript
{
  success: boolean;
  data: {
    friends: User[];
    pendingRequests: User[]; // incoming requests
    sentRequests: User[]; // outgoing requests
  };
}
```

#### POST /friends/request
Send friend request.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```typescript
{
  userId: string;
}
```

#### PUT /friends/request/:id/respond
Respond to friend request.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```typescript
{
  action: 'accept' | 'decline';
}
```

#### DELETE /friends/:id
Remove friend.

**Headers:** `Authorization: Bearer <token>`

#### POST /friends/challenge
Create friend challenge.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```typescript
{
  friendId: string;
  goal: number;
  duration: number; // in days
  startDate: string; // ISO datetime
}
```

#### GET /friends/challenges
Get friend challenges.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `status`: 'pending' | 'active' | 'completed'

**Response:**
```typescript
{
  success: boolean;
  data: FriendChallenge[];
}
```

#### PUT /friends/challenges/:id/respond
Respond to friend challenge.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```typescript
{
  action: 'accept' | 'decline';
}
```

### Rewards Endpoints

#### GET /rewards
Get user's rewards.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `type`: 'Coupon' | 'Badge' | 'Points'
- `status`: 'available' | 'redeemed' | 'expired'

**Response:**
```typescript
{
  success: boolean;
  data: {
    id: string;
    type: string;
    value: string | number;
    description: string;
    imageUrl?: string;
    earnedAt: string;
    expiryDate?: string;
    isRedeemed: boolean;
    redeemedAt?: string;
  }[];
}
```

#### POST /rewards/:id/redeem
Redeem a reward.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```typescript
{
  success: boolean;
  message: string;
  data: {
    redeemCode?: string;
    instructions: string;
  };
}
```

#### GET /rewards/points
Get user's points balance.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```typescript
{
  success: boolean;
  data: {
    totalPoints: number;
    availablePoints: number;
    lifetimeEarned: number;
    lifetimeSpent: number;
  };
}
```

### Notifications Endpoints

#### GET /notifications
Get user notifications.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `type`: 'CHALLENGE' | 'ACHIEVEMENT' | 'FRIEND' | 'SYSTEM'
- `isRead`: boolean
- `limit`: number (default: 50)
- `offset`: number (default: 0)

**Response:**
```typescript
{
  success: boolean;
  data: {
    notifications: Notification[];
    unreadCount: number;
    total: number;
  };
}
```

#### PUT /notifications/:id/read
Mark notification as read.

**Headers:** `Authorization: Bearer <token>`

#### PUT /notifications/read-all
Mark all notifications as read.

**Headers:** `Authorization: Bearer <token>`

#### POST /notifications/device-token
Register device token for push notifications.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```typescript
{
  deviceToken: string;
  platform: 'ios' | 'android';
}
```

### File Upload Endpoints

#### POST /uploads/avatar
Upload user avatar.

**Headers:** `Authorization: Bearer <token>`

**Request:** Multipart form data with image file

**Response:**
```typescript
{
  success: boolean;
  data: {
    imageUrl: string;
  };
}
```

#### POST /uploads/challenge-image
Upload challenge image (Admin only).

**Headers:** `Authorization: Bearer <token>`

**Request:** Multipart form data with image file

### Admin Endpoints

#### GET /admin/users
Get all users (Admin only).

**Query Parameters:**
- `search`: string
- `isActive`: boolean
- `isPremium`: boolean
- `limit`: number
- `offset`: number

#### GET /admin/challenges
Get all challenges for management.

#### PUT /admin/challenges/:id
Update challenge details.

#### DELETE /admin/challenges/:id
Delete challenge.

#### GET /admin/analytics
Get analytics data.

**Response:**
```typescript
{
  success: boolean;
  data: {
    totalUsers: number;
    activeUsers: number;
    totalChallenges: number;
    activeChallenges: number;
    userGrowth: number; // percentage
    engagementRate: number;
    averageStepsPerUser: number;
    topChallenges: Challenge[];
  };
}
```

## Authentication & Security

### JWT Token Structure
```typescript
{
  sub: string; // user id
  email: string;
  username: string;
  role: 'user' | 'admin';
  iat: number; // issued at
  exp: number; // expiration
}
```

### Rate Limiting
- General API calls: 100 requests per minute per user
- Authentication endpoints: 5 requests per minute per IP
- File uploads: 10 requests per minute per user

### Input Validation
All endpoints use class-validator decorators for input validation:
- Email format validation
- Password strength requirements (min 8 chars, 1 uppercase, 1 number)
- Username format (alphanumeric, 3-20 chars)
- File size limits (avatar: 5MB, challenge images: 10MB)

### Error Responses
Standardized error response format:
```typescript
{
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: string;
}
```

## Challenge Progress Tracking Architecture

### Automatic Progress Updates
The system uses an event-driven architecture for challenge progress tracking:

1. **Health Data Sync**: When users call `POST /health/sync`, the system automatically:
   - Saves the health data
   - Identifies all active challenges for the user
   - Updates daily progress for each relevant challenge
   - Recalculates total progress and completion percentages
   - Updates rankings in real-time
   - Awards points for completed challenges

2. **Background Automation**: The `ChallengeAutomationService` runs scheduled tasks:
   - **Daily (midnight)**: Syncs any missed health data with challenges
   - **Hourly**: Updates rankings and checks for completions
   - **Daily (1 AM)**: Cleans up expired challenges and finalizes results

3. **Real-time Features**:
   - Progress updates are immediate when health data is synced
   - Rankings are updated in real-time
   - Challenge completions trigger automatic point awards
   - Leaderboards reflect current standings

### Data Flow
```
Mobile App -> POST /health/sync -> HealthService.syncHealthData()
                                      ↓
                              ChallengeProgressService.syncChallengeProgressFromHealthData()
                                      ↓
                              [Update daily progress for all active challenges]
                                      ↓
                              [Recalculate total progress and rankings]
                                      ↓
                              [Check for completions and award points]
```

This architecture ensures data consistency, eliminates the need for manual progress updates, and provides a seamless user experience where fitness activities automatically contribute to challenge goals.

## Environment Variables

```env
# Database
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=winfit
DATABASE_USER=postgres
DATABASE_PASSWORD=password
DATABASE_SSL=false

# JWT
JWT_SECRET=your-jwt-secret-key
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=your-refresh-secret-key
JWT_REFRESH_EXPIRES_IN=7d

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# AWS S3
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=us-east-1
AWS_S3_BUCKET=winfit-uploads

# Email Service
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-email-password

# Push Notifications
FCM_SERVER_KEY=your-fcm-server-key
APNS_KEY_ID=your-apns-key-id
APNS_TEAM_ID=your-team-id
APNS_PRIVATE_KEY_PATH=path/to/private/key

# App Configuration
APP_PORT=3000
APP_URL=http://localhost:3000
API_VERSION=v1
NODE_ENV=development
```

## Deployment Considerations

### Docker Configuration
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
EXPOSE 3000
CMD ["node", "dist/main.js"]
```

### Database Migrations
Use TypeORM migrations for database schema management:
```bash
npm run migration:generate -- --name CreateUsersTable
npm run migration:run
```

### Health Checks
Implement health check endpoint:
```typescript
GET /health
Response: {
  status: 'ok' | 'error';
  database: 'connected' | 'disconnected';
  redis: 'connected' | 'disconnected';
  uptime: number;
  timestamp: string;
}
```

### Monitoring & Logging
- Use Winston for structured logging
- Implement Prometheus metrics
- Set up Sentry for error tracking
- Monitor API response times and error rates

## Testing Strategy

### Unit Tests
- Service layer testing with mocked dependencies
- Repository testing with in-memory database
- Utility function testing

### Integration Tests
- API endpoint testing with test database
- Authentication flow testing
- Database transaction testing

### E2E Tests
- Complete user journey testing
- Challenge lifecycle testing
- Notification system testing

## Performance Optimization

### Caching Strategy
- Redis cache for leaderboards (TTL: 5 minutes)
- User session caching
- Challenge data caching
- Health data aggregation caching

### Database Optimization
- Proper indexing on frequently queried columns
- Database connection pooling
- Query optimization and monitoring
- Pagination for large datasets

### API Response Optimization
- Response compression (gzip)
- Selective field loading
- Lazy loading for relationships
- Response caching headers

This comprehensive API specification provides all the necessary endpoints and functionality to support the WinFit mobile application with a robust, scalable backend built on NestJS and TypeScript. The challenge progress tracking system is now fully integrated with health data synchronization, providing a seamless and efficient user experience. 