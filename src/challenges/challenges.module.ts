import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChallengesController } from './challenges.controller';
import { ChallengesService } from './challenges.service';
import { ChallengeAutomationService } from './challenge-automation.service';
import { ChallengeProgressService } from './challenge-progress.service';
import { ChallengeBaselineService } from './challenge-baseline.service';
import { Challenge } from './entities/challenge.entity';
import { UserChallenge } from './entities/user-challenge.entity';
import { ChallengeProgress } from './entities/challenge-progress.entity';
import { HealthData } from '../health/entities/health-data.entity';
import { User } from '../users/entities/user.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { RewardsModule } from '../rewards/rewards.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Challenge,
      UserChallenge,
      ChallengeProgress,
      HealthData,
      User,
    ]),
    NotificationsModule,
    RewardsModule,
  ],
  controllers: [ChallengesController],
  providers: [
    ChallengesService,
    ChallengeAutomationService,
    ChallengeProgressService,
    ChallengeBaselineService,
  ],
  exports: [
    ChallengesService,
    ChallengeAutomationService,
    ChallengeProgressService,
    ChallengeBaselineService,
  ],
})
export class ChallengesModule {}
