import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { Challenge } from './entities/challenge.entity';
import { UserChallenge } from './entities/user-challenge.entity';
import { ChallengeProgress } from './entities/challenge-progress.entity';
import { HealthData } from '../health/entities/health-data.entity';
import { User } from '../users/entities/user.entity';

export interface BaselineData {
  steps: number;
  distance: number;
  activeMinutes: number;
  totalSteps: number;
  totalDistance: number;
  baselineDate: Date;
}

export interface ChallengeProgressUpdate {
  progressValue: number;
  baselineValue: number;
  challengeProgress: number;
  percentage: number;
}

@Injectable()
export class ChallengeBaselineService {
  private readonly logger = new Logger(ChallengeBaselineService.name);

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
  ) {}

  /**
   * Calculate and set baseline when user joins a challenge
   */
  async setUserChallengeBaseline(
    userId: string,
    challengeId: string,
  ): Promise<BaselineData> {
    const challenge = await this.challengeRepository.findOne({
      where: { id: challengeId },
    });

    if (!challenge) {
      throw new Error('Challenge not found');
    }

    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Determine baseline date (challenge start date or current date, whichever is earlier)
    const now = new Date();
    const baselineDate = challenge.startDate <= now ? challenge.startDate : now;

    // Get baseline data
    const baseline = await this.calculateBaselineData(
      userId,
      baselineDate,
      challenge,
    );

    // Update user challenge with baseline
    await this.userChallengeRepository.update(
      { userId, challengeId },
      {
        baselineDate: baseline.baselineDate,
        baselineSteps: baseline.steps,
        baselineDistance: baseline.distance,
        baselineActiveMinutes: baseline.activeMinutes,
        baselineTotalSteps: baseline.totalSteps,
        baselineTotalDistance: baseline.totalDistance,
      },
    );

    this.logger.log(
      `Set baseline for user ${userId} in challenge ${challengeId}: ${JSON.stringify(baseline)}`,
    );

    return baseline;
  }

  /**
   * Calculate baseline data for a user at a specific date
   */
  private async calculateBaselineData(
    userId: string,
    baselineDate: Date,
    challenge: Challenge,
  ): Promise<BaselineData> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Get health data from the baseline date (or closest available date)
    const healthData = await this.getClosestHealthData(userId, baselineDate);

    if (!healthData) {
      // If no health data exists, use current user totals as baseline
      return {
        steps: 0,
        distance: 0,
        activeMinutes: 0,
        totalSteps: user.totalSteps,
        totalDistance: user.totalDistance,
        baselineDate,
      };
    }

    // For cumulative challenges, we need the total accumulated values up to baseline date
    if (this.isCumulativeChallenge(challenge)) {
      const cumulativeData = await this.getCumulativeDataUpToDate(
        userId,
        baselineDate,
      );
      return {
        steps: 0, // Daily steps reset each day
        distance: 0, // Daily distance reset each day
        activeMinutes: 0, // Daily active minutes reset each day
        totalSteps: cumulativeData.totalSteps,
        totalDistance: cumulativeData.totalDistance,
        baselineDate,
      };
    } else {
      // For daily/period-based challenges, use the day's values
      return {
        steps: healthData.steps,
        distance: healthData.distance,
        activeMinutes: healthData.activeMinutes,
        totalSteps: user.totalSteps,
        totalDistance: user.totalDistance,
        baselineDate,
      };
    }
  }

  /**
   * Get the closest available health data to a specific date
   */
  private async getClosestHealthData(
    userId: string,
    targetDate: Date,
  ): Promise<HealthData | null> {
    // Try to get data from the exact date first
    let healthData = await this.healthDataRepository.findOne({
      where: {
        user: { id: userId },
        date: targetDate,
      },
    });

    if (healthData) {
      return healthData;
    }

    // If no exact match, get the closest previous date within 7 days
    const sevenDaysAgo = new Date(targetDate);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    healthData = await this.healthDataRepository.findOne({
      where: {
        user: { id: userId },
        date: Between(sevenDaysAgo, targetDate),
      },
      order: { date: 'DESC' },
    });

    return healthData;
  }

  /**
   * Get cumulative data up to a specific date
   */
  private async getCumulativeDataUpToDate(
    userId: string,
    date: Date,
  ): Promise<{ totalSteps: number; totalDistance: number }> {
    const result = await this.healthDataRepository
      .createQueryBuilder('health')
      .select('SUM(health.steps)', 'totalSteps')
      .addSelect('SUM(health.distance)', 'totalDistance')
      .where('health.user.id = :userId', { userId })
      .andWhere('health.date <= :date', { date })
      .getRawOne();

    return {
      totalSteps: parseInt(result.totalSteps || '0'),
      totalDistance: parseInt(result.totalDistance || '0'),
    };
  }

  /**
   * Update challenge progress based on health data sync
   */
  async updateChallengeProgressFromHealthSync(
    userId: string,
    date: Date,
    healthData: HealthData,
  ): Promise<void> {
    try {
      // Get all active challenges for the user
      const userChallenges = await this.getUserActiveChallenges(userId, date);

      for (const userChallenge of userChallenges) {
        await this.updateSingleChallengeProgress(
          userChallenge,
          date,
          healthData,
        );
      }
    } catch (error) {
      this.logger.error(
        `Error updating challenge progress for user ${userId}:`,
        error,
      );
    }
  }

  /**
   * Update progress for a single challenge
   */
  private async updateSingleChallengeProgress(
    userChallenge: UserChallenge,
    date: Date,
    healthData: HealthData,
  ): Promise<void> {
    const challenge = userChallenge.challenge;

    // Skip if no baseline is set (shouldn't happen, but safety check)
    if (!userChallenge.baselineDate) {
      this.logger.warn(
        `No baseline set for user ${userChallenge.userId} in challenge ${challenge.id}`,
      );
      return;
    }

    // Skip if health data is before challenge start or baseline date
    if (date < challenge.startDate || date < userChallenge.baselineDate) {
      return;
    }

    // Calculate progress update
    const progressUpdate = await this.calculateProgressUpdate(
      userChallenge,
      date,
      healthData,
    );

    if (progressUpdate) {
      // Update daily progress entry
      await this.updateDailyProgressEntry(
        userChallenge.id,
        date,
        progressUpdate,
      );

      // Recalculate total progress
      await this.recalculateChallengeProgress(userChallenge.id);
    }
  }

  /**
   * Calculate progress update for a specific challenge and date
   */
  private async calculateProgressUpdate(
    userChallenge: UserChallenge,
    date: Date,
    healthData: HealthData,
  ): Promise<ChallengeProgressUpdate | null> {
    const challenge = userChallenge.challenge;

    let progressValue = 0;
    let baselineValue = 0;

    // Determine values based on challenge category and type
    if (challenge.category === 'Steps') {
      if (this.isCumulativeChallenge(challenge)) {
        // For cumulative challenges, calculate total progress since baseline
        const baselineDate = userChallenge.baselineDate;
        if (!baselineDate) {
          this.logger.warn(
            `No baseline date set for user ${userChallenge.userId} in challenge ${challenge.id}`,
          );
          return null;
        }
        const currentTotal = await this.getTotalStepsSinceBaseline(
          userChallenge.userId,
          baselineDate,
          date,
        );
        progressValue = Math.max(
          0,
          currentTotal - userChallenge.baselineTotalSteps,
        );
        baselineValue = 0;
      } else {
        // For daily challenges, use daily values
        progressValue = healthData.steps;
        baselineValue = userChallenge.baselineSteps;
      }
    } else if (challenge.category === 'Distance') {
      if (this.isCumulativeChallenge(challenge)) {
        const baselineDate = userChallenge.baselineDate;
        if (!baselineDate) {
          this.logger.warn(
            `No baseline date set for user ${userChallenge.userId} in challenge ${challenge.id}`,
          );
          return null;
        }
        const currentTotal = await this.getTotalDistanceSinceBaseline(
          userChallenge.userId,
          baselineDate,
          date,
        );
        progressValue = Math.max(
          0,
          currentTotal - userChallenge.baselineTotalDistance,
        );
        baselineValue = 0;
      } else {
        progressValue = healthData.distance;
        baselineValue = userChallenge.baselineDistance;
      }
    } else if (challenge.category === 'Time') {
      progressValue = healthData.activeMinutes;
      baselineValue = userChallenge.baselineActiveMinutes;
    }

    // Calculate challenge-specific progress (progress made since baseline)
    const challengeProgress = Math.max(0, progressValue - baselineValue);

    // Calculate percentage
    const percentage = Math.min(
      (challengeProgress / challenge.goal) * 100,
      100,
    );

    return {
      progressValue,
      baselineValue,
      challengeProgress,
      percentage,
    };
  }

  /**
   * Update daily progress entry
   */
  private async updateDailyProgressEntry(
    userChallengeId: string,
    date: Date,
    progressUpdate: ChallengeProgressUpdate,
  ): Promise<void> {
    let progressEntry = await this.challengeProgressRepository.findOne({
      where: {
        userChallenge: { id: userChallengeId },
        date,
      },
    });

    if (progressEntry) {
      // Update existing entry
      progressEntry.dailySteps = progressUpdate.challengeProgress;
      progressEntry.dailyDistance = progressUpdate.challengeProgress;
      progressEntry.percentage = progressUpdate.percentage;
    } else {
      // Create new entry
      progressEntry = this.challengeProgressRepository.create({
        userChallenge: { id: userChallengeId },
        date,
        dailySteps: progressUpdate.challengeProgress,
        dailyDistance: progressUpdate.challengeProgress,
        percentage: progressUpdate.percentage,
      });
    }

    await this.challengeProgressRepository.save(progressEntry);
  }

  /**
   * Recalculate total challenge progress
   */
  private async recalculateChallengeProgress(
    userChallengeId: string,
  ): Promise<void> {
    const userChallenge = await this.userChallengeRepository.findOne({
      where: { id: userChallengeId },
      relations: ['challenge', 'progress'],
    });

    if (!userChallenge) {
      return;
    }

    // Calculate total progress based on challenge type
    let totalProgress = 0;

    if (this.isCumulativeChallenge(userChallenge.challenge)) {
      // For cumulative challenges, take the maximum progress (latest total)
      totalProgress = Math.max(
        ...userChallenge.progress.map((p) => p.dailySteps),
        0,
      );
    } else {
      // For period-based challenges, sum all daily progress
      totalProgress = userChallenge.progress.reduce(
        (sum, p) => sum + p.dailySteps,
        0,
      );
    }

    const completionPercentage = Math.min(
      (totalProgress / userChallenge.challenge.goal) * 100,
      100,
    );
    const isCompleted = completionPercentage >= 100;

    await this.userChallengeRepository.update(userChallengeId, {
      currentProgress: totalProgress,
      completionPercentage,
      isCompleted,
      completedAt:
        isCompleted && !userChallenge.completedAt
          ? new Date()
          : userChallenge.completedAt,
    });
  }

  /**
   * Get user's active challenges for a specific date
   */
  private async getUserActiveChallenges(
    userId: string,
    date: Date,
  ): Promise<UserChallenge[]> {
    return this.userChallengeRepository.find({
      where: {
        user: { id: userId },
        isCompleted: false,
        challenge: {
          isActive: true,
          startDate: LessThanOrEqual(date),
          endDate: MoreThanOrEqual(date),
        },
      },
      relations: ['challenge'],
    });
  }

  /**
   * Get total steps since baseline date
   */
  private async getTotalStepsSinceBaseline(
    userId: string,
    baselineDate: Date,
    endDate: Date,
  ): Promise<number> {
    const result = await this.healthDataRepository
      .createQueryBuilder('health')
      .select('SUM(health.steps)', 'totalSteps')
      .where('health.user.id = :userId', { userId })
      .andWhere('health.date >= :baselineDate', { baselineDate })
      .andWhere('health.date <= :endDate', { endDate })
      .getRawOne();

    return parseInt(result.totalSteps || '0');
  }

  /**
   * Get total distance since baseline date
   */
  private async getTotalDistanceSinceBaseline(
    userId: string,
    baselineDate: Date,
    endDate: Date,
  ): Promise<number> {
    const result = await this.healthDataRepository
      .createQueryBuilder('health')
      .select('SUM(health.distance)', 'totalDistance')
      .where('health.user.id = :userId', { userId })
      .andWhere('health.date >= :baselineDate', { baselineDate })
      .andWhere('health.date <= :endDate', { endDate })
      .getRawOne();

    return parseInt(result.totalDistance || '0');
  }

  /**
   * Check if challenge is cumulative type
   */
  private isCumulativeChallenge(challenge: Challenge): boolean {
    // Challenges longer than 7 days are typically cumulative
    // You can also add a field to Challenge entity to explicitly mark this
    const durationInDays = Math.ceil(
      (challenge.endDate.getTime() - challenge.startDate.getTime()) /
        (1000 * 60 * 60 * 24),
    );
    return durationInDays > 7 || challenge.type === 'Group';
  }

  /**
   * Handle retroactive health data sync
   */
  async handleRetroactiveSync(
    userId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<void> {
    const healthDataEntries = await this.healthDataRepository.find({
      where: {
        user: { id: userId },
        date: Between(startDate, endDate),
      },
      order: { date: 'ASC' },
    });

    for (const healthData of healthDataEntries) {
      await this.updateChallengeProgressFromHealthSync(
        userId,
        healthData.date,
        healthData,
      );
    }
  }
}
