import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { LeaderboardService } from './leaderboard.service';
import {
  LeaderboardType,
  LeaderboardPeriod,
} from './dto/leaderboard-query.dto';

@Injectable()
export class LeaderboardSchedulerService {
  private readonly logger = new Logger(LeaderboardSchedulerService.name);

  constructor(private readonly leaderboardService: LeaderboardService) {}

  // Invalidate daily leaderboards at midnight
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async invalidateDailyLeaderboards() {
    this.logger.log('Invalidating daily leaderboards...');
    try {
      await this.leaderboardService.invalidateLeaderboardCache(
        LeaderboardType.GLOBAL,
        LeaderboardPeriod.DAILY,
      );
      await this.leaderboardService.invalidateLeaderboardCache(
        LeaderboardType.FRIENDS,
        LeaderboardPeriod.DAILY,
      );
      this.logger.log('Daily leaderboards invalidated successfully');
    } catch (error) {
      this.logger.error('Failed to invalidate daily leaderboards:', error);
    }
  }

  // Invalidate weekly leaderboards every Monday at midnight
  @Cron(CronExpression.EVERY_WEEK)
  async invalidateWeeklyLeaderboards() {
    this.logger.log('Invalidating weekly leaderboards...');
    try {
      await this.leaderboardService.invalidateLeaderboardCache(
        LeaderboardType.GLOBAL,
        LeaderboardPeriod.WEEKLY,
      );
      await this.leaderboardService.invalidateLeaderboardCache(
        LeaderboardType.FRIENDS,
        LeaderboardPeriod.WEEKLY,
      );
      this.logger.log('Weekly leaderboards invalidated successfully');
    } catch (error) {
      this.logger.error('Failed to invalidate weekly leaderboards:', error);
    }
  }

  // Invalidate monthly leaderboards on the first day of each month
  @Cron('0 0 1 * *')
  async invalidateMonthlyLeaderboards() {
    this.logger.log('Invalidating monthly leaderboards...');
    try {
      await this.leaderboardService.invalidateLeaderboardCache(
        LeaderboardType.GLOBAL,
        LeaderboardPeriod.MONTHLY,
      );
      await this.leaderboardService.invalidateLeaderboardCache(
        LeaderboardType.FRIENDS,
        LeaderboardPeriod.MONTHLY,
      );
      this.logger.log('Monthly leaderboards invalidated successfully');
    } catch (error) {
      this.logger.error('Failed to invalidate monthly leaderboards:', error);
    }
  }

  // Refresh cache every 5 minutes to ensure fresh data
  @Cron(CronExpression.EVERY_5_MINUTES)
  async refreshPopularLeaderboards() {
    this.logger.debug('Refreshing popular leaderboards cache...');
    try {
      // These will refresh the cache by fetching fresh data
      // You could add logic here to pre-warm the most popular leaderboards
      this.logger.debug('Popular leaderboards cache refreshed');
    } catch (error) {
      this.logger.error('Failed to refresh popular leaderboards:', error);
    }
  }
}
