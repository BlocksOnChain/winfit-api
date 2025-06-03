import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '@nestjs/cache-manager';
import { ScheduleModule } from '@nestjs/schedule';
import { LeaderboardController } from './leaderboard.controller';
import { LeaderboardService } from './leaderboard.service';
import { LeaderboardSchedulerService } from './leaderboard-scheduler.service';
import { User } from '../users/entities/user.entity';
import { UserChallenge } from '../challenges/entities/user-challenge.entity';
import { HealthData } from '../health/entities/health-data.entity';
import { Friendship } from '../friends/entities/friendship.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, UserChallenge, HealthData, Friendship]),
    CacheModule.register(),
    ScheduleModule.forRoot(),
  ],
  controllers: [LeaderboardController],
  providers: [LeaderboardService, LeaderboardSchedulerService],
  exports: [LeaderboardService],
})
export class LeaderboardModule {}
