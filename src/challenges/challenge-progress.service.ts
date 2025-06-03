import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { Challenge } from './entities/challenge.entity';
import { UserChallenge } from './entities/user-challenge.entity';
import { ChallengeProgress } from './entities/challenge-progress.entity';
import { HealthData } from '../health/entities/health-data.entity';
import { ChallengeBaselineService } from './challenge-baseline.service';

@Injectable()
export class ChallengeProgressService {
  constructor(
    @InjectRepository(Challenge)
    private readonly challengeRepository: Repository<Challenge>,
    @InjectRepository(UserChallenge)
    private readonly userChallengeRepository: Repository<UserChallenge>,
    @InjectRepository(ChallengeProgress)
    private readonly challengeProgressRepository: Repository<ChallengeProgress>,
    private readonly challengeBaselineService: ChallengeBaselineService,
  ) {}

  /**
   * Update challenge progress for all active user challenges when health data is synced
   * Now uses the new baseline service for proper progress tracking
   */
  async syncChallengeProgressFromHealthData(
    userId: string,
    date: Date,
    healthData: HealthData,
  ): Promise<void> {
    try {
      // Use the new baseline service for comprehensive progress tracking
      await this.challengeBaselineService.updateChallengeProgressFromHealthSync(
        userId,
        date,
        healthData,
      );
    } catch (error) {
      // Log error but don't fail health sync if challenge sync fails
      console.error(
        'Error syncing challenge progress from health data:',
        error,
      );
    }
  }

  /**
   * Handle retroactive health data sync
   */
  async handleRetroactiveSync(
    userId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<void> {
    try {
      await this.challengeBaselineService.handleRetroactiveSync(
        userId,
        startDate,
        endDate,
      );
    } catch (error) {
      console.error('Error handling retroactive sync:', error);
    }
  }

  /**
   * Recalculate progress for a specific user challenge
   * Useful for manual corrections or data fixes
   */
  async recalculateUserChallengeProgress(
    userChallengeId: string,
  ): Promise<void> {
    const userChallenge = await this.userChallengeRepository.findOne({
      where: { id: userChallengeId },
      relations: ['challenge', 'user'],
    });

    if (!userChallenge || !userChallenge.baselineDate) {
      return;
    }

    const challenge = userChallenge.challenge;
    const startDate = new Date(
      Math.max(
        challenge.startDate.getTime(),
        userChallenge.baselineDate.getTime(),
      ),
    );
    const endDate = new Date(
      Math.min(challenge.endDate.getTime(), new Date().getTime()),
    );

    // Re-sync all health data for the challenge period
    await this.challengeBaselineService.handleRetroactiveSync(
      userChallenge.userId,
      startDate,
      endDate,
    );
  }

  /**
   * Update challenge rankings for a specific challenge
   */
  async updateChallengeRankings(challengeId: string): Promise<void> {
    try {
      const userChallenges = await this.userChallengeRepository.find({
        where: { challenge: { id: challengeId } },
        order: { currentProgress: 'DESC', joinedAt: 'ASC' },
      });

      for (let i = 0; i < userChallenges.length; i++) {
        await this.userChallengeRepository.update(userChallenges[i].id, {
          rank: i + 1,
        });
      }
    } catch (error) {
      console.error(
        `Error updating rankings for challenge ${challengeId}:`,
        error,
      );
    }
  }

  /**
   * Get challenge progress statistics
   */
  async getChallengeProgressStats(challengeId: string): Promise<any> {
    const result = await this.userChallengeRepository
      .createQueryBuilder('uc')
      .select([
        'COUNT(*) as totalParticipants',
        'COUNT(CASE WHEN uc.isCompleted = true THEN 1 END) as completedCount',
        'AVG(uc.completionPercentage) as averageProgress',
        'MAX(uc.currentProgress) as highestProgress',
      ])
      .where('uc.challengeId = :challengeId', { challengeId })
      .getRawOne();

    return {
      totalParticipants: parseInt(result.totalParticipants || '0'),
      completedCount: parseInt(result.completedCount || '0'),
      completionRate:
        result.totalParticipants > 0
          ? (result.completedCount / result.totalParticipants) * 100
          : 0,
      averageProgress: parseFloat(result.averageProgress || '0'),
      highestProgress: parseInt(result.highestProgress || '0'),
    };
  }

  /**
   * Legacy method - kept for backward compatibility but now delegates to baseline service
   * @deprecated Use ChallengeBaselineService directly
   */
  async updateChallengeProgressEntry(
    userChallengeId: string,
    date: Date,
    progressValue: number,
    goal: number,
  ): Promise<ChallengeProgress> {
    const percentage = Math.min((progressValue / goal) * 100, 100);

    let challengeProgress = await this.challengeProgressRepository.findOne({
      where: {
        userChallenge: { id: userChallengeId },
        date: date,
      },
    });

    if (challengeProgress) {
      challengeProgress.dailySteps = progressValue;
      challengeProgress.dailyDistance = progressValue;
      challengeProgress.percentage = percentage;
    } else {
      challengeProgress = this.challengeProgressRepository.create({
        userChallenge: { id: userChallengeId },
        date: date,
        dailySteps: progressValue,
        dailyDistance: progressValue,
        percentage: percentage,
      });
    }

    return this.challengeProgressRepository.save(challengeProgress);
  }
}
