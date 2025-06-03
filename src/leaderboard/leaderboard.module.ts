import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LeaderboardController } from './leaderboard.controller';
import { LeaderboardService } from './leaderboard.service';
import { User } from '../users/entities/user.entity';
import { UserChallenge } from '../challenges/entities/user-challenge.entity';
import { HealthData } from '../health/entities/health-data.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, UserChallenge, HealthData]),
  ],
  controllers: [LeaderboardController],
  providers: [LeaderboardService],
  exports: [LeaderboardService],
})
export class LeaderboardModule {} 