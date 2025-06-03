import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThanOrEqual, LessThanOrEqual } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { HealthData } from './entities/health-data.entity';
import { User } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { ChallengeProgressService } from '../challenges/challenge-progress.service';
import {
  SyncHealthDataDto,
  BatchSyncHealthDataDto,
} from './dto/sync-health-data.dto';
import { HealthQueryDto, HealthAggregationType } from './dto/health-query.dto';
import {
  HealthSummaryQueryDto,
  HealthSummaryPeriod,
} from './dto/health-query.dto';
import { HealthDataResponseDto } from './dto/health-data-response.dto';
import {
  HealthSummaryResponseDto,
  BestDayDto,
  TrendsDto,
  StreakDto,
  WeeklyGoalDto,
} from './dto/health-summary-response.dto';
import { DailyGoalResponseDto } from './dto/daily-goal-response.dto';
import { AchievementsService } from '../achievements/achievements.service';

@Injectable()
export class HealthService {
  constructor(
    @InjectRepository(HealthData)
    private readonly healthDataRepository: Repository<HealthData>,
    private readonly usersService: UsersService,
    private readonly challengeProgressService: ChallengeProgressService,
    private readonly achievementsService: AchievementsService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async syncHealthData(
    userId: string,
    syncHealthDataDto: SyncHealthDataDto,
  ): Promise<HealthDataResponseDto> {
    const date = new Date(syncHealthDataDto.date);

    // Check if data already exists for this date
    let healthData = await this.healthDataRepository.findOne({
      where: {
        user: { id: userId },
        date,
      },
    });

    if (healthData) {
      // Update existing data with smart merging
      // Only update fields that have higher values (for cumulative data) or are explicitly provided
      Object.assign(healthData, {
        steps: Math.max(syncHealthDataDto.steps, healthData.steps),
        distance: Math.max(syncHealthDataDto.distance, healthData.distance),
        caloriesBurned:
          syncHealthDataDto.caloriesBurned !== undefined
            ? Math.max(
                syncHealthDataDto.caloriesBurned,
                healthData.caloriesBurned || 0,
              )
            : healthData.caloriesBurned,
        activeMinutes:
          syncHealthDataDto.activeMinutes !== undefined
            ? Math.max(
                syncHealthDataDto.activeMinutes,
                healthData.activeMinutes || 0,
              )
            : healthData.activeMinutes,
        floorsClimbed:
          syncHealthDataDto.floorsClimbed !== undefined
            ? Math.max(
                syncHealthDataDto.floorsClimbed,
                healthData.floorsClimbed || 0,
              )
            : healthData.floorsClimbed,
        heartRateAvg: syncHealthDataDto.heartRateAvg || healthData.heartRateAvg,
        sleepHours: syncHealthDataDto.sleepHours || healthData.sleepHours,
        waterIntakeMl:
          syncHealthDataDto.waterIntakeMl !== undefined
            ? Math.max(
                syncHealthDataDto.waterIntakeMl,
                healthData.waterIntakeMl || 0,
              )
            : healthData.waterIntakeMl,
        updatedAt: new Date(),
      });
    } else {
      // Create new data
      healthData = this.healthDataRepository.create({
        user: { id: userId } as User,
        date,
        steps: syncHealthDataDto.steps,
        distance: syncHealthDataDto.distance,
        caloriesBurned: syncHealthDataDto.caloriesBurned || 0,
        activeMinutes: syncHealthDataDto.activeMinutes || 0,
        floorsClimbed: syncHealthDataDto.floorsClimbed || 0,
        heartRateAvg: syncHealthDataDto.heartRateAvg,
        sleepHours: syncHealthDataDto.sleepHours,
        waterIntakeMl: syncHealthDataDto.waterIntakeMl || 0,
      });
    }

    const savedHealthData = await this.healthDataRepository.save(healthData);

    // Update user totals, invalidate caches, sync challenge progress, and check achievements
    await Promise.all([
      this.updateUserTotals(userId),
      this.invalidateUserCaches(userId),
      this.challengeProgressService.syncChallengeProgressFromHealthData(
        userId,
        date,
        savedHealthData,
      ),
      // Process achievements after health data sync
      this.achievementsService.processAchievementsFromHealthSync(
        userId,
        savedHealthData,
      ),
    ]);

    return HealthDataResponseDto.fromEntity(savedHealthData);
  }

  /**
   * Batch sync multiple health data entries
   * Useful for mobile apps syncing multiple days of data
   */
  async batchSyncHealthData(
    userId: string,
    batchSyncDto: BatchSyncHealthDataDto,
  ): Promise<{
    synced: number;
    errors: Array<{ date: string; error: string }>;
    challengesUpdated: number;
  }> {
    const results = {
      synced: 0,
      errors: [] as Array<{ date: string; error: string }>,
      challengesUpdated: 0,
    };

    // Sort entries by date to ensure proper chronological processing
    const sortedEntries = batchSyncDto.healthData.sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );

    // Process entries in batches to avoid overwhelming the database
    const batchSize = 10;
    for (let i = 0; i < sortedEntries.length; i += batchSize) {
      const batch = sortedEntries.slice(i, i + batchSize);

      await Promise.all(
        batch.map(async (entry) => {
          try {
            await this.syncHealthData(userId, entry);
            results.synced++;
          } catch (error) {
            results.errors.push({
              date: entry.date,
              error: error.message || 'Unknown error',
            });
          }
        }),
      );
    }

    // Handle retroactive sync if needed
    if (batchSyncDto.isRetroactive && sortedEntries.length > 0) {
      try {
        const startDate = new Date(sortedEntries[0].date);
        const endDate = new Date(sortedEntries[sortedEntries.length - 1].date);

        await this.challengeProgressService.handleRetroactiveSync(
          userId,
          startDate,
          endDate,
        );
        results.challengesUpdated = 1;
      } catch (error) {
        console.error('Error in retroactive challenge sync:', error);
      }
    }

    // Final cache invalidation after batch processing
    await this.invalidateUserCaches(userId);

    return results;
  }

  /**
   * Handle smart health data sync that considers data gaps and mobile app patterns
   */
  async smartSyncHealthData(
    userId: string,
    syncHealthDataDto: SyncHealthDataDto,
  ): Promise<{
    data: HealthDataResponseDto;
    gapsFilled: number;
    challengesUpdated: boolean;
  }> {
    const result = await this.syncHealthData(userId, syncHealthDataDto);
    let gapsFilled = 0;
    let challengesUpdated = false;

    const syncDate = new Date(syncHealthDataDto.date);

    // Check for data gaps in the last 7 days and try to fill them
    const sevenDaysAgo = new Date(syncDate);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const existingData = await this.healthDataRepository.find({
      where: {
        user: { id: userId },
        date: Between(sevenDaysAgo, syncDate),
      },
      order: { date: 'ASC' },
    });

    // Identify gaps and interpolate missing data if reasonable
    for (
      let d = new Date(sevenDaysAgo);
      d < syncDate;
      d.setDate(d.getDate() + 1)
    ) {
      const dateExists = existingData.some(
        (data) => data.date.getTime() === d.getTime(),
      );

      if (!dateExists) {
        // Create minimal health entry for missing days to maintain challenge continuity
        // This is conservative - only adds zero values, real data must come from user
        const gapData = this.healthDataRepository.create({
          user: { id: userId } as User,
          date: new Date(d),
          steps: 0,
          distance: 0,
          caloriesBurned: 0,
          activeMinutes: 0,
          floorsClimbed: 0,
          waterIntakeMl: 0,
        });

        await this.healthDataRepository.save(gapData);
        gapsFilled++;
      }
    }

    // If gaps were filled, trigger retroactive challenge sync
    if (gapsFilled > 0) {
      try {
        await this.challengeProgressService.handleRetroactiveSync(
          userId,
          sevenDaysAgo,
          syncDate,
        );
        challengesUpdated = true;
      } catch (error) {
        console.error('Error in retroactive sync after gap filling:', error);
      }
    }

    return {
      data: result,
      gapsFilled,
      challengesUpdated,
    };
  }

  async getHealthData(
    userId: string,
    query: HealthQueryDto,
  ): Promise<HealthDataResponseDto[]> {
    const cacheKey = `health_data:${userId}:${query.startDate}:${query.endDate}:${query.aggregation}`;

    // Try to get from cache first
    const cached =
      await this.cacheManager.get<HealthDataResponseDto[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const start = new Date(query.startDate);
    const end = new Date(query.endDate);

    const healthData = await this.healthDataRepository.find({
      where: {
        user: { id: userId },
        date: Between(start, end),
      },
      order: { date: 'ASC' },
    });

    let result: HealthData[];
    switch (query.aggregation) {
      case HealthAggregationType.WEEKLY:
        result = this.aggregateWeekly(healthData);
        break;
      case HealthAggregationType.MONTHLY:
        result = this.aggregateMonthly(healthData);
        break;
      default:
        result = healthData;
    }

    const responseData = HealthDataResponseDto.fromEntities(result);

    // Cache for 10 minutes
    await this.cacheManager.set(cacheKey, responseData, 600000);

    return responseData;
  }

  async getHealthSummary(
    userId: string,
    query: HealthSummaryQueryDto,
  ): Promise<HealthSummaryResponseDto> {
    const cacheKey = `health_summary:${userId}:${query.period}`;

    // Check cache first
    const cached =
      await this.cacheManager.get<HealthSummaryResponseDto>(cacheKey);
    if (cached) {
      return cached;
    }

    const now = new Date();
    const period = query.period || HealthSummaryPeriod.WEEK;
    const { startDate, endDate } = this.getPeriodDates(period, now);

    const [healthData, user] = await Promise.all([
      this.healthDataRepository.find({
        where: {
          user: { id: userId },
          date: Between(startDate, endDate),
        },
        order: { date: 'ASC' },
      }),
      this.usersService.findById(userId),
    ]);

    const summary = await this.calculateDetailedSummary(
      healthData,
      user,
      startDate,
      endDate,
      period,
    );

    // Cache for 5 minutes
    await this.cacheManager.set(cacheKey, summary, 300000);

    return summary;
  }

  async getDailyGoalProgress(userId: string): Promise<DailyGoalResponseDto> {
    const cacheKey = `daily_goal:${userId}:${new Date().toISOString().split('T')[0]}`;

    // Check cache first (short TTL for real-time updates)
    const cached = await this.cacheManager.get<DailyGoalResponseDto>(cacheKey);
    if (cached) {
      return cached;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [user, todayHealthData, currentStreak] = await Promise.all([
      this.usersService.findById(userId),
      this.healthDataRepository.findOne({
        where: {
          user: { id: userId },
          date: today,
        },
      }),
      this.getCurrentStreak(userId),
    ]);

    const currentSteps = todayHealthData?.steps || 0;
    const currentDistance = todayHealthData?.distance || 0;
    const currentCalories = todayHealthData?.caloriesBurned || 0;
    const currentActiveMinutes = todayHealthData?.activeMinutes || 0;
    const dailyGoal = user.dailyStepGoal;
    const progress = Math.min((currentSteps / dailyGoal) * 100, 100);

    // Calculate time-based metrics
    const now = new Date();
    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);
    const hoursRemaining = Math.max(
      0,
      (endOfDay.getTime() - now.getTime()) / (1000 * 60 * 60),
    );
    const remainingSteps = Math.max(dailyGoal - currentSteps, 0);
    const stepsPerHourNeeded =
      hoursRemaining > 0 ? Math.ceil(remainingSteps / hoursRemaining) : 0;

    // Determine if user is on track (considering time of day)
    const hoursElapsed = (now.getTime() - today.getTime()) / (1000 * 60 * 60);
    const expectedStepsByNow = (dailyGoal * hoursElapsed) / 24;
    const onTrack = currentSteps >= expectedStepsByNow * 0.8; // 80% buffer

    const result: DailyGoalResponseDto = {
      currentSteps,
      dailyGoal,
      progress: Math.round(progress * 100) / 100,
      remainingSteps,
      goalAchieved: currentSteps >= dailyGoal,
      currentDistance,
      currentCalories,
      currentActiveMinutes,
      hoursRemaining: Math.round(hoursRemaining * 100) / 100,
      stepsPerHourNeeded,
      onTrack,
      currentStreak,
      date: today.toISOString().split('T')[0],
    };

    // Cache for 2 minutes for near real-time updates
    await this.cacheManager.set(cacheKey, result, 120000);

    return result;
  }

  private async calculateDetailedSummary(
    healthData: HealthData[],
    user: User,
    startDate: Date,
    endDate: Date,
    period: HealthSummaryPeriod,
  ): Promise<HealthSummaryResponseDto> {
    if (healthData.length === 0) {
      return this.getEmptySummary(user, startDate, endDate);
    }

    // Calculate basic metrics
    const totalSteps = healthData.reduce((sum, data) => sum + data.steps, 0);
    const totalDistance = healthData.reduce(
      (sum, data) => sum + data.distance,
      0,
    );
    const totalCalories = healthData.reduce(
      (sum, data) => sum + data.caloriesBurned,
      0,
    );
    const totalActiveMinutes = healthData.reduce(
      (sum, data) => sum + data.activeMinutes,
      0,
    );
    const activeDays = healthData.filter((data) => data.steps > 0).length;
    const totalDays = healthData.length;
    const averageDailySteps = Math.round(totalSteps / totalDays);
    const averageDailyDistance = Math.round(totalDistance / totalDays);
    const activityPercentage = Math.round((activeDays / totalDays) * 100);

    // Find best day
    const bestDay = healthData.reduce((best, current) =>
      current.steps > best.steps ? current : best,
    );

    // Calculate trends
    const trends = await this.calculateTrends(user.id, startDate, period);

    // Calculate streak
    const streak = await this.calculateStreak(user.id, user.dailyStepGoal);

    // Calculate weekly goal progress
    const weeklyGoal = this.calculateWeeklyGoal(healthData, user);

    // Calculate goal achievement stats
    const goalAchievedDays = healthData.filter(
      (data) => data.steps >= user.dailyStepGoal,
    ).length;
    const goalAchievementRate = Math.round(
      (goalAchievedDays / totalDays) * 100,
    );

    return {
      totalSteps,
      totalDistance,
      totalCalories,
      totalActiveMinutes,
      averageDailySteps,
      averageDailyDistance,
      activeDays,
      totalDays,
      activityPercentage,
      bestDay: {
        date: bestDay.date.toISOString().split('T')[0],
        steps: bestDay.steps,
      },
      trends,
      streak,
      weeklyGoal,
      goalAchievedDays,
      goalAchievementRate,
    };
  }

  private async calculateTrends(
    userId: string,
    currentPeriodStart: Date,
    period: HealthSummaryPeriod,
  ): Promise<TrendsDto> {
    const periodLength = currentPeriodStart.getTime() - new Date().getTime();
    const previousPeriodStart = new Date(
      currentPeriodStart.getTime() - Math.abs(periodLength),
    );
    const previousPeriodEnd = new Date(currentPeriodStart.getTime() - 1);

    const previousHealthData = await this.healthDataRepository.find({
      where: {
        user: { id: userId },
        date: Between(previousPeriodStart, previousPeriodEnd),
      },
    });

    if (previousHealthData.length === 0) {
      return {
        stepsChange: 0,
        distanceChange: 0,
        caloriesChange: 0,
        activeMinutesChange: 0,
      };
    }

    const currentHealthData = await this.healthDataRepository.find({
      where: {
        user: { id: userId },
        date: MoreThanOrEqual(currentPeriodStart),
      },
    });

    const currentTotals = this.calculateTotals(currentHealthData);
    const previousTotals = this.calculateTotals(previousHealthData);

    return {
      stepsChange: this.calculatePercentageChange(
        currentTotals.steps,
        previousTotals.steps,
      ),
      distanceChange: this.calculatePercentageChange(
        currentTotals.distance,
        previousTotals.distance,
      ),
      caloriesChange: this.calculatePercentageChange(
        currentTotals.calories,
        previousTotals.calories,
      ),
      activeMinutesChange: this.calculatePercentageChange(
        currentTotals.activeMinutes,
        previousTotals.activeMinutes,
      ),
    };
  }

  private async calculateStreak(
    userId: string,
    dailyGoal: number,
  ): Promise<StreakDto> {
    const [currentStreak, longestStreak] = await Promise.all([
      this.getCurrentStreak(userId, dailyGoal),
      this.getLongestStreak(userId, dailyGoal),
    ]);

    const daysToRecord =
      longestStreak > currentStreak
        ? longestStreak - currentStreak + 1
        : undefined;

    return { current: currentStreak, longest: longestStreak, daysToRecord };
  }

  private async getCurrentStreak(
    userId: string,
    dailyGoal?: number,
  ): Promise<number> {
    if (!dailyGoal) {
      const user = await this.usersService.findById(userId);
      dailyGoal = user.dailyStepGoal;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let streak = 0;
    const currentDate = new Date(today);

    while (true) {
      const healthData = await this.healthDataRepository.findOne({
        where: {
          user: { id: userId },
          date: currentDate,
        },
      });

      if (!healthData || healthData.steps < dailyGoal) {
        break;
      }

      streak++;
      currentDate.setDate(currentDate.getDate() - 1);
    }

    return streak;
  }

  private async getLongestStreak(
    userId: string,
    dailyGoal: number,
  ): Promise<number> {
    const healthData = await this.healthDataRepository.find({
      where: { user: { id: userId } },
      order: { date: 'ASC' },
    });

    let longestStreak = 0;
    let currentStreak = 0;

    for (const data of healthData) {
      if (data.steps >= dailyGoal) {
        currentStreak++;
        longestStreak = Math.max(longestStreak, currentStreak);
      } else {
        currentStreak = 0;
      }
    }

    return longestStreak;
  }

  private calculateWeeklyGoal(
    healthData: HealthData[],
    user: User,
  ): WeeklyGoalDto {
    const weeklyGoal = user.weeklyStepGoal;
    const currentSteps = healthData.reduce((sum, data) => sum + data.steps, 0);
    const progress = Math.min((currentSteps / weeklyGoal) * 100, 100);
    const remainingSteps = Math.max(weeklyGoal - currentSteps, 0);

    return {
      currentSteps,
      weeklyGoal,
      progress: Math.round(progress * 100) / 100,
      remainingSteps,
      goalAchieved: currentSteps >= weeklyGoal,
    };
  }

  private calculateTotals(healthData: HealthData[]) {
    return {
      steps: healthData.reduce((sum, data) => sum + data.steps, 0),
      distance: healthData.reduce((sum, data) => sum + data.distance, 0),
      calories: healthData.reduce((sum, data) => sum + data.caloriesBurned, 0),
      activeMinutes: healthData.reduce(
        (sum, data) => sum + data.activeMinutes,
        0,
      ),
    };
  }

  private calculatePercentageChange(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100 * 100) / 100;
  }

  private getEmptySummary(
    user: User,
    startDate: Date,
    endDate: Date,
  ): HealthSummaryResponseDto {
    const totalDays = Math.ceil(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
    );

    return {
      totalSteps: 0,
      totalDistance: 0,
      totalCalories: 0,
      totalActiveMinutes: 0,
      averageDailySteps: 0,
      averageDailyDistance: 0,
      activeDays: 0,
      totalDays,
      activityPercentage: 0,
      bestDay: { date: '', steps: 0 },
      trends: {
        stepsChange: 0,
        distanceChange: 0,
        caloriesChange: 0,
        activeMinutesChange: 0,
      },
      streak: { current: 0, longest: 0 },
      weeklyGoal: {
        currentSteps: 0,
        weeklyGoal: user.weeklyStepGoal,
        progress: 0,
        remainingSteps: user.weeklyStepGoal,
        goalAchieved: false,
      },
      goalAchievedDays: 0,
      goalAchievementRate: 0,
    };
  }

  private getPeriodDates(
    period: HealthSummaryPeriod,
    now: Date,
  ): { startDate: Date; endDate: Date } {
    const endDate = new Date(now);
    let startDate: Date;

    switch (period) {
      case HealthSummaryPeriod.WEEK:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case HealthSummaryPeriod.MONTH:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case HealthSummaryPeriod.YEAR:
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
    }

    return { startDate, endDate };
  }

  private async updateUserTotals(userId: string): Promise<void> {
    const result = await this.healthDataRepository
      .createQueryBuilder('health_data')
      .select('SUM(health_data.steps)', 'totalSteps')
      .addSelect('SUM(health_data.distance)', 'totalDistance')
      .where('health_data.user_id = :userId', { userId })
      .getRawOne();

    await this.usersService.updateUserTotals(userId, {
      totalSteps: parseInt(result.totalSteps) || 0,
      totalDistance: parseInt(result.totalDistance) || 0,
    });
  }

  private async invalidateUserCaches(userId: string): Promise<void> {
    const patterns = [
      `health_data:${userId}:*`,
      `health_summary:${userId}:*`,
      `daily_goal:${userId}:*`,
    ];

    // Note: In a real Redis implementation, you'd use Redis commands to delete by pattern
    // For now, we'll just clear specific cache keys we know about
    const today = new Date().toISOString().split('T')[0];
    const keys = [
      `daily_goal:${userId}:${today}`,
      `health_summary:${userId}:week`,
      `health_summary:${userId}:month`,
      `health_summary:${userId}:year`,
    ];

    await Promise.all(keys.map((key) => this.cacheManager.del(key)));
  }

  private aggregateWeekly(healthData: HealthData[]): HealthData[] {
    const weeklyData: { [key: string]: HealthData } = {};

    healthData.forEach((data) => {
      const weekStart = this.getWeekStart(data.date);
      const weekKey = weekStart.toISOString().split('T')[0];

      if (!weeklyData[weekKey]) {
        weeklyData[weekKey] = {
          ...data,
          date: weekStart,
          steps: 0,
          distance: 0,
          caloriesBurned: 0,
          activeMinutes: 0,
          floorsClimbed: 0,
          heartRateAvg: 0,
          sleepHours: 0,
          waterIntakeMl: 0,
        } as HealthData;
      }

      weeklyData[weekKey].steps += data.steps;
      weeklyData[weekKey].distance += data.distance;
      weeklyData[weekKey].caloriesBurned += data.caloriesBurned;
      weeklyData[weekKey].activeMinutes += data.activeMinutes;
      weeklyData[weekKey].floorsClimbed += data.floorsClimbed;

      // Average values for heart rate and sleep
      if (data.heartRateAvg && weeklyData[weekKey].heartRateAvg !== undefined) {
        weeklyData[weekKey].heartRateAvg = Math.round(
          (weeklyData[weekKey].heartRateAvg + data.heartRateAvg) / 2,
        );
      }
      if (data.sleepHours) {
        weeklyData[weekKey].sleepHours = Number(
          (
            (Number(weeklyData[weekKey].sleepHours) + Number(data.sleepHours)) /
            2
          ).toFixed(2),
        );
      }
      weeklyData[weekKey].waterIntakeMl += data.waterIntakeMl;
    });

    return Object.values(weeklyData);
  }

  private aggregateMonthly(healthData: HealthData[]): HealthData[] {
    const monthlyData: { [key: string]: HealthData } = {};

    healthData.forEach((data) => {
      const monthStart = new Date(
        data.date.getFullYear(),
        data.date.getMonth(),
        1,
      );
      const monthKey = monthStart.toISOString().split('T')[0];

      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = {
          ...data,
          date: monthStart,
          steps: 0,
          distance: 0,
          caloriesBurned: 0,
          activeMinutes: 0,
          floorsClimbed: 0,
          heartRateAvg: 0,
          sleepHours: 0,
          waterIntakeMl: 0,
        } as HealthData;
      }

      monthlyData[monthKey].steps += data.steps;
      monthlyData[monthKey].distance += data.distance;
      monthlyData[monthKey].caloriesBurned += data.caloriesBurned;
      monthlyData[monthKey].activeMinutes += data.activeMinutes;
      monthlyData[monthKey].floorsClimbed += data.floorsClimbed;

      // Average values for heart rate and sleep
      if (
        data.heartRateAvg &&
        monthlyData[monthKey].heartRateAvg !== undefined
      ) {
        monthlyData[monthKey].heartRateAvg = Math.round(
          (monthlyData[monthKey].heartRateAvg + data.heartRateAvg) / 2,
        );
      }
      if (data.sleepHours) {
        monthlyData[monthKey].sleepHours = Number(
          (
            (Number(monthlyData[monthKey].sleepHours) +
              Number(data.sleepHours)) /
            2
          ).toFixed(2),
        );
      }
      monthlyData[monthKey].waterIntakeMl += data.waterIntakeMl;
    });

    return Object.values(monthlyData);
  }

  private getWeekStart(date: Date): Date {
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    const weekStart = new Date(date);
    weekStart.setDate(diff);
    weekStart.setHours(0, 0, 0, 0);
    return weekStart;
  }
}
