import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '@nestjs/cache-manager';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { HealthData } from './entities/health-data.entity';
import { UsersModule } from '../users/users.module';
import { ChallengesModule } from '../challenges/challenges.module';
import { AchievementsModule } from '../achievements/achievements.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([HealthData]),
    UsersModule,
    ChallengesModule,
    AchievementsModule,
    CacheModule.register({
      ttl: 300, // 5 minutes default TTL
      max: 100, // maximum number of items in cache
    }),
  ],
  controllers: [HealthController],
  providers: [HealthService],
  exports: [HealthService],
})
export class HealthModule {}
