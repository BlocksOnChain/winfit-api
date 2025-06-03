import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, MoreThan } from 'typeorm';
import { Challenge } from './entities/challenge.entity';
import { UserChallenge } from './entities/user-challenge.entity';
import { ChallengeProgress } from './entities/challenge-progress.entity';
import { HealthData } from '../health/entities/health-data.entity';
import { User } from '../users/entities/user.entity';
import { ChallengeProgressService } from './challenge-progress.service';
import { RewardsService } from '../rewards/rewards.service';
import { TransactionSource } from '../rewards/entities/points-transaction.entity';

@Injectable()
export class ChallengeAutomationService {
  private readonly logger = new Logger(ChallengeAutomationService.name);

  constructor(
    @InjectRepository(Challenge)
    private readonly challengeRepository: Repository<Challenge>,
    @InjectRepository(UserChallenge)
    private readonly userChallengeRepository: Repository<UserChallenge>,
    @InjectRepository(ChallengeProgress)
    private readonly challengeProgressRepository: Repository<ChallengeProgress>,
    @InjectRepository(HealthData)
    private readonly healthDataRepository: Repository<HealthData>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly challengeProgressService: ChallengeProgressService,
    private readonly rewardsService: RewardsService,
  ) {}

  /**
   * Run every day at midnight to sync health data with active challenges
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async syncDailyChallengeProgress(): Promise<void> {
    this.logger.log('Starting daily challenge progress sync...');

    try {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);

      const activeChallenges = await this.getActiveChallenges();
      this.logger.log(`Found ${activeChallenges.length} active challenges`);

      for (const challenge of activeChallenges) {
        await this.syncChallengeProgress(challenge, yesterday);
      }

      this.logger.log('Daily challenge progress sync completed');
    } catch (error) {
      this.logger.error('Error during daily challenge progress sync:', error);
    }
  }

  /**
   * Run every hour to check for challenge completions and update rankings
   */
  @Cron(CronExpression.EVERY_HOUR)
  async updateChallengeRankingsAndCompletions(): Promise<void> {
    this.logger.log('Starting challenge rankings and completions update...');

    try {
      const activeChallenges = await this.getActiveChallenges();

      for (const challenge of activeChallenges) {
        await this.challengeProgressService.updateChallengeRankings(
          challenge.id,
        );
        await this.checkChallengeCompletions(challenge.id);
      }

      this.logger.log('Challenge rankings and completions update completed');
    } catch (error) {
      this.logger.error('Error during rankings and completions update:', error);
    }
  }

  /**
   * Run daily at 1 AM to clean up expired challenges
   */
  @Cron('0 1 * * *')
  async cleanupExpiredChallenges(): Promise<void> {
    this.logger.log('Starting expired challenges cleanup...');

    try {
      const now = new Date();
      const expiredChallenges = await this.challengeRepository.find({
        where: {
          endDate: LessThan(now),
          isActive: true,
        },
      });

      for (const challenge of expiredChallenges) {
        await this.finalizeChallengeResults(challenge);
      }

      this.logger.log(
        `Cleaned up ${expiredChallenges.length} expired challenges`,
      );
    } catch (error) {
      this.logger.error('Error during expired challenges cleanup:', error);
    }
  }

  /**
   * Sync health data with challenge progress for a specific challenge and date
   */
  private async syncChallengeProgress(
    challenge: Challenge,
    date: Date,
  ): Promise<void> {
    const userChallenges = await this.userChallengeRepository.find({
      where: { challenge: { id: challenge.id }, isCompleted: false },
      relations: ['user'],
    });

    for (const userChallenge of userChallenges) {
      try {
        const healthData = await this.healthDataRepository.findOne({
          where: {
            user: { id: userChallenge.user.id },
            date: date,
          },
        });

        if (healthData) {
          // Use the shared service for consistency
          await this.challengeProgressService.syncChallengeProgressFromHealthData(
            userChallenge.user.id,
            date,
            healthData,
          );
        }
      } catch (error) {
        this.logger.error(
          `Error syncing progress for user ${userChallenge.user.id} in challenge ${challenge.id}:`,
          error,
        );
      }
    }
  }

  /**
   * Check for challenge completions and award points
   */
  private async checkChallengeCompletions(challengeId: string): Promise<void> {
    const completedChallenges = await this.userChallengeRepository.find({
      where: {
        challenge: { id: challengeId },
        isCompleted: true,
        pointsEarned: 0, // Not yet awarded points
      },
      relations: ['challenge', 'user'],
    });

    for (const userChallenge of completedChallenges) {
      // Calculate points based on challenge difficulty and ranking
      const points = this.calculateCompletionPoints(
        userChallenge.challenge.difficulty,
        userChallenge.rank || 999,
      );

      await this.userChallengeRepository.update(userChallenge.id, {
        pointsEarned: points,
      });

      // Award points using the rewards system
      await this.rewardsService.awardPoints(
        userChallenge.user.id,
        points,
        TransactionSource.CHALLENGE,
        `Challenge completion: ${userChallenge.challenge.title}`,
        userChallenge.challenge.id,
      );

      // Update user's experience points
      await this.userRepository.increment(
        { id: userChallenge.user.id },
        'experience',
        points,
      );

      // TODO: Trigger achievement checks
      // TODO: Send completion notification

      this.logger.log(
        `Awarded ${points} points to user ${userChallenge.user.id} for completing challenge ${challengeId}`,
      );
    }
  }

  /**
   * Calculate completion points based on difficulty and ranking
   */
  private calculateCompletionPoints(difficulty: string, rank: number): number {
    let basePoints = 0;
    switch (difficulty) {
      case 'Easy':
        basePoints = 100;
        break;
      case 'Medium':
        basePoints = 250;
        break;
      case 'Hard':
        basePoints = 500;
        break;
      default:
        basePoints = 100;
    }

    // Bonus points for top positions
    if (rank === 1) {
      basePoints *= 2; // Double points for 1st place
    } else if (rank === 2) {
      basePoints *= 1.5; // 50% bonus for 2nd place
    } else if (rank === 3) {
      basePoints *= 1.25; // 25% bonus for 3rd place
    }

    return Math.round(basePoints);
  }

  /**
   * Finalize challenge results when it expires
   */
  private async finalizeChallengeResults(challenge: Challenge): Promise<void> {
    // Final ranking update
    await this.challengeProgressService.updateChallengeRankings(challenge.id);

    // Award any remaining points
    await this.checkChallengeCompletions(challenge.id);

    // Mark challenge as inactive
    await this.challengeRepository.update(challenge.id, { isActive: false });

    // TODO: Generate challenge summary report
    // TODO: Send completion notifications to all participants

    this.logger.log(`Finalized results for challenge: ${challenge.title}`);
  }

  /**
   * Get all currently active challenges
   */
  private async getActiveChallenges(): Promise<Challenge[]> {
    const now = new Date();
    return this.challengeRepository.find({
      where: {
        isActive: true,
        startDate: LessThan(now),
        endDate: MoreThan(now),
      },
    });
  }

  /**
   * Manual method to sync specific user's challenge progress
   */
  async syncUserChallengeProgress(
    userId: string,
    challengeId: string,
    date: Date,
  ): Promise<void> {
    const healthData = await this.healthDataRepository.findOne({
      where: {
        user: { id: userId },
        date: date,
      },
    });

    if (healthData) {
      await this.challengeProgressService.syncChallengeProgressFromHealthData(
        userId,
        date,
        healthData,
      );
    }
  }
}
