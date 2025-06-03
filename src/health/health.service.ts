import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThanOrEqual, LessThanOrEqual } from 'typeorm';
import { HealthData } from './entities/health-data.entity';
import { User } from '../users/entities/user.entity';
import { SyncHealthDataDto } from './dto/sync-health-data.dto';
import { UsersService } from '../users/users.service';

@Injectable()
export class HealthService {
  constructor(
    @InjectRepository(HealthData)
    private readonly healthDataRepository: Repository<HealthData>,
    private readonly usersService: UsersService,
  ) {}

  async syncHealthData(userId: string, syncHealthDataDto: SyncHealthDataDto): Promise<HealthData> {
    const date = new Date(syncHealthDataDto.date);
    
    // Check if data already exists for this date
    let healthData = await this.healthDataRepository.findOne({
      where: {
        user: { id: userId },
        date,
      },
    });

    if (healthData) {
      // Update existing data
      Object.assign(healthData, {
        steps: syncHealthDataDto.steps,
        distance: syncHealthDataDto.distance,
        caloriesBurned: syncHealthDataDto.caloriesBurned || healthData.caloriesBurned,
        activeMinutes: syncHealthDataDto.activeMinutes || healthData.activeMinutes,
        floorsClimbed: syncHealthDataDto.floorsClimbed || healthData.floorsClimbed,
        heartRateAvg: syncHealthDataDto.heartRateAvg || healthData.heartRateAvg,
        sleepHours: syncHealthDataDto.sleepHours || healthData.sleepHours,
        waterIntakeMl: syncHealthDataDto.waterIntakeMl || healthData.waterIntakeMl,
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

    // Update user totals
    await this.updateUserTotals(userId);

    return savedHealthData;
  }

  async getHealthData(
    userId: string,
    startDate: string,
    endDate: string,
    aggregation: string,
  ): Promise<HealthData[]> {
    const start = new Date(startDate);
    const end = new Date(endDate);

    const healthData = await this.healthDataRepository.find({
      where: {
        user: { id: userId },
        date: Between(start, end),
      },
      order: { date: 'ASC' },
    });

    if (aggregation === 'weekly') {
      return this.aggregateWeekly(healthData);
    } else if (aggregation === 'monthly') {
      return this.aggregateMonthly(healthData);
    }

    return healthData;
  }

  async getHealthSummary(userId: string, period: string): Promise<any> {
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    const healthData = await this.healthDataRepository.find({
      where: {
        user: { id: userId },
        date: MoreThanOrEqual(startDate),
      },
      order: { date: 'ASC' },
    });

    if (healthData.length === 0) {
      return {
        totalSteps: 0,
        totalDistance: 0,
        averageDailySteps: 0,
        activeDays: 0,
        bestDay: null,
        trends: { stepsChange: 0, distanceChange: 0 },
      };
    }

    const totalSteps = healthData.reduce((sum, data) => sum + data.steps, 0);
    const totalDistance = healthData.reduce((sum, data) => sum + data.distance, 0);
    const activeDays = healthData.filter(data => data.steps > 0).length;
    const averageDailySteps = totalSteps / healthData.length;

    const bestDay = healthData.reduce((best, current) => 
      current.steps > best.steps ? current : best
    );

    // Calculate trends (compare with previous period)
    const previousPeriodStart = new Date(startDate.getTime() - (now.getTime() - startDate.getTime()));
    const previousHealthData = await this.healthDataRepository.find({
      where: {
        user: { id: userId },
        date: Between(previousPeriodStart, startDate),
      },
    });

    const previousTotalSteps = previousHealthData.reduce((sum, data) => sum + data.steps, 0);
    const previousTotalDistance = previousHealthData.reduce((sum, data) => sum + data.distance, 0);

    const stepsChange = previousTotalSteps > 0 
      ? ((totalSteps - previousTotalSteps) / previousTotalSteps) * 100 
      : 0;
    const distanceChange = previousTotalDistance > 0 
      ? ((totalDistance - previousTotalDistance) / previousTotalDistance) * 100 
      : 0;

    return {
      totalSteps,
      totalDistance,
      averageDailySteps: Math.round(averageDailySteps),
      activeDays,
      bestDay: {
        date: bestDay.date.toISOString().split('T')[0],
        steps: bestDay.steps,
      },
      trends: {
        stepsChange: Math.round(stepsChange * 100) / 100,
        distanceChange: Math.round(distanceChange * 100) / 100,
      },
    };
  }

  async getDailyGoalProgress(userId: string): Promise<any> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const user = await this.usersService.findById(userId);
    const todayHealthData = await this.healthDataRepository.findOne({
      where: {
        user: { id: userId },
        date: today,
      },
    });

    const currentSteps = todayHealthData?.steps || 0;
    const dailyGoal = user.dailyStepGoal;
    const progress = Math.min((currentSteps / dailyGoal) * 100, 100);

    return {
      currentSteps,
      dailyGoal,
      progress: Math.round(progress * 100) / 100,
      remainingSteps: Math.max(dailyGoal - currentSteps, 0),
      goalAchieved: currentSteps >= dailyGoal,
    };
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

  private aggregateWeekly(healthData: HealthData[]): HealthData[] {
    const weeklyData: { [key: string]: HealthData } = {};

    healthData.forEach(data => {
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
        } as HealthData;
      }

      weeklyData[weekKey].steps += data.steps;
      weeklyData[weekKey].distance += data.distance;
      weeklyData[weekKey].caloriesBurned += data.caloriesBurned;
      weeklyData[weekKey].activeMinutes += data.activeMinutes;
      weeklyData[weekKey].floorsClimbed += data.floorsClimbed;
    });

    return Object.values(weeklyData);
  }

  private aggregateMonthly(healthData: HealthData[]): HealthData[] {
    const monthlyData: { [key: string]: HealthData } = {};

    healthData.forEach(data => {
      const monthStart = new Date(data.date.getFullYear(), data.date.getMonth(), 1);
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
        } as HealthData;
      }

      monthlyData[monthKey].steps += data.steps;
      monthlyData[monthKey].distance += data.distance;
      monthlyData[monthKey].caloriesBurned += data.caloriesBurned;
      monthlyData[monthKey].activeMinutes += data.activeMinutes;
      monthlyData[monthKey].floorsClimbed += data.floorsClimbed;
    });

    return Object.values(monthlyData);
  }

  private getWeekStart(date: Date): Date {
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    return new Date(date.setDate(diff));
  }
} 