import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan, Between } from 'typeorm';
import { Cache } from 'cache-manager';
import { User } from '../users/entities/user.entity';
import { UserChallenge } from '../challenges/entities/user-challenge.entity';
import { HealthData } from '../health/entities/health-data.entity';
import {
  Friendship,
  FriendshipStatus,
} from '../friends/entities/friendship.entity';
import {
  LeaderboardType,
  LeaderboardPeriod,
  LeaderboardQueryDto,
  UserRankQueryDto,
} from './dto/leaderboard-query.dto';
import {
  LeaderboardResponseDto,
  LeaderboardEntryDto,
  UserRankResponseDto,
  LeaderboardUserDto,
} from './dto/leaderboard-response.dto';

interface LeaderboardCacheData {
  entries: LeaderboardEntryDto[];
  totalParticipants: number;
  lastUpdated: string;
}

@Injectable()
export class LeaderboardService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserChallenge)
    private readonly userChallengeRepository: Repository<UserChallenge>,
    @InjectRepository(HealthData)
    private readonly healthDataRepository: Repository<HealthData>,
    @InjectRepository(Friendship)
    private readonly friendshipRepository: Repository<Friendship>,
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
  ) {}

  async getLeaderboard(
    options: LeaderboardQueryDto,
    userId: string,
  ): Promise<LeaderboardResponseDto> {
    const {
      type = LeaderboardType.GLOBAL,
      period = LeaderboardPeriod.WEEKLY,
      challengeId,
      limit = 50,
    } = options;

    // Generate cache key
    const cacheKey = this.generateCacheKey(type, period, challengeId, limit);

    // Check cache first
    const cached = await this.cacheManager.get<LeaderboardCacheData>(cacheKey);
    if (cached) {
      const userRank = this.findUserRank(cached.entries, userId);
      return {
        id: this.generateLeaderboardId(type, period, challengeId),
        name: this.generateLeaderboardName(type, period),
        type,
        period,
        entries: cached.entries,
        userRank: userRank || undefined,
        totalParticipants: cached.totalParticipants,
        lastUpdated: cached.lastUpdated,
      };
    }

    // Generate fresh leaderboard
    let leaderboardData: LeaderboardCacheData;

    if (type === LeaderboardType.CHALLENGE && challengeId) {
      leaderboardData = await this.getChallengeLeaderboard(challengeId, limit);
    } else if (type === LeaderboardType.FRIENDS) {
      leaderboardData = await this.getFriendsLeaderboard(userId, period, limit);
    } else {
      leaderboardData = await this.getGlobalLeaderboard(period, limit);
    }

    // Cache the result (TTL: 5 minutes)
    await this.cacheManager.set(cacheKey, leaderboardData, 300);

    const userRank = this.findUserRank(leaderboardData.entries, userId);

    return {
      id: this.generateLeaderboardId(type, period, challengeId),
      name: this.generateLeaderboardName(type, period),
      type,
      period,
      entries: leaderboardData.entries,
      userRank: userRank || undefined,
      totalParticipants: leaderboardData.totalParticipants,
      lastUpdated: leaderboardData.lastUpdated,
    };
  }

  async getUserRank(
    userId: string,
    options: UserRankQueryDto,
  ): Promise<UserRankResponseDto> {
    const { type = LeaderboardType.GLOBAL, period = LeaderboardPeriod.WEEKLY } =
      options;

    const cacheKey = `user-rank:${userId}:${type}:${period}`;
    const cached = await this.cacheManager.get<UserRankResponseDto>(cacheKey);

    if (cached) {
      return cached;
    }

    let rankData: UserRankResponseDto;

    if (type === LeaderboardType.FRIENDS) {
      rankData = await this.getFriendsUserRank(userId, period);
    } else {
      rankData = await this.getGlobalUserRank(userId, period);
    }

    // Cache for 2 minutes
    await this.cacheManager.set(cacheKey, rankData, 120);

    return rankData;
  }

  private async getGlobalLeaderboard(
    period: LeaderboardPeriod,
    limit: number,
  ): Promise<LeaderboardCacheData> {
    const dateRange = this.getDateRange(period);

    if (period === LeaderboardPeriod.ALL_TIME) {
      // Use total steps from user entity for all-time leaderboard
      const users = await this.userRepository
        .createQueryBuilder('user')
        .select([
          'user.id',
          'user.username',
          'user.firstName',
          'user.lastName',
          'user.avatarUrl',
          'user.totalSteps',
        ])
        .where('user.isActive = :isActive', { isActive: true })
        .andWhere('user.totalSteps > :minSteps', { minSteps: 0 })
        .orderBy('user.totalSteps', 'DESC')
        .limit(limit)
        .getMany();

      const entries = users.map((user, index) => ({
        rank: index + 1,
        user: this.mapToLeaderboardUser(user),
        score: user.totalSteps,
      }));

      return {
        entries,
        totalParticipants: await this.userRepository.count({
          where: { isActive: true },
        }),
        lastUpdated: new Date().toISOString(),
      };
    } else {
      // Use health data for period-based leaderboards
      const healthData = await this.healthDataRepository
        .createQueryBuilder('health')
        .innerJoin('health.user', 'user')
        .select([
          'user.id',
          'user.username',
          'user.firstName',
          'user.lastName',
          'user.avatarUrl',
          'SUM(health.steps) as totalSteps',
        ])
        .where('user.isActive = :isActive', { isActive: true })
        .andWhere('health.date BETWEEN :startDate AND :endDate', {
          startDate: dateRange.start,
          endDate: dateRange.end,
        })
        .groupBy(
          'user.id, user.username, user.firstName, user.lastName, user.avatarUrl',
        )
        .orderBy('totalSteps', 'DESC')
        .limit(limit)
        .getRawMany();

      const entries = healthData.map((item, index) => ({
        rank: index + 1,
        user: {
          id: item.user_id,
          username: item.user_username,
          firstName: item.user_firstName,
          lastName: item.user_lastName,
          avatarUrl: item.user_avatarUrl,
        },
        score: parseInt(item.totalSteps) || 0,
      }));

      return {
        entries,
        totalParticipants: entries.length,
        lastUpdated: new Date().toISOString(),
      };
    }
  }

  private async getFriendsLeaderboard(
    userId: string,
    period: LeaderboardPeriod,
    limit: number,
  ): Promise<LeaderboardCacheData> {
    // Get user's friends
    const friendships = await this.friendshipRepository.find({
      where: [
        { requesterId: userId, status: FriendshipStatus.ACCEPTED },
        { addresseeId: userId, status: FriendshipStatus.ACCEPTED },
      ],
    });

    const friendIds = friendships.map((f) =>
      f.requesterId === userId ? f.addresseeId : f.requesterId,
    );

    // Include the user themselves in the leaderboard
    friendIds.push(userId);

    if (friendIds.length === 0) {
      return {
        entries: [],
        totalParticipants: 0,
        lastUpdated: new Date().toISOString(),
      };
    }

    const dateRange = this.getDateRange(period);

    if (period === LeaderboardPeriod.ALL_TIME) {
      const users = await this.userRepository
        .createQueryBuilder('user')
        .select([
          'user.id',
          'user.username',
          'user.firstName',
          'user.lastName',
          'user.avatarUrl',
          'user.totalSteps',
        ])
        .where('user.id IN (:...friendIds)', { friendIds })
        .andWhere('user.isActive = :isActive', { isActive: true })
        .orderBy('user.totalSteps', 'DESC')
        .limit(limit)
        .getMany();

      const entries = users.map((user, index) => ({
        rank: index + 1,
        user: this.mapToLeaderboardUser(user),
        score: user.totalSteps,
      }));

      return {
        entries,
        totalParticipants: friendIds.length,
        lastUpdated: new Date().toISOString(),
      };
    } else {
      const healthData = await this.healthDataRepository
        .createQueryBuilder('health')
        .innerJoin('health.user', 'user')
        .select([
          'user.id',
          'user.username',
          'user.firstName',
          'user.lastName',
          'user.avatarUrl',
          'SUM(health.steps) as totalSteps',
        ])
        .where('user.id IN (:...friendIds)', { friendIds })
        .andWhere('user.isActive = :isActive', { isActive: true })
        .andWhere('health.date BETWEEN :startDate AND :endDate', {
          startDate: dateRange.start,
          endDate: dateRange.end,
        })
        .groupBy(
          'user.id, user.username, user.firstName, user.lastName, user.avatarUrl',
        )
        .orderBy('totalSteps', 'DESC')
        .limit(limit)
        .getRawMany();

      const entries = healthData.map((item, index) => ({
        rank: index + 1,
        user: {
          id: item.user_id,
          username: item.user_username,
          firstName: item.user_firstName,
          lastName: item.user_lastName,
          avatarUrl: item.user_avatarUrl,
        },
        score: parseInt(item.totalSteps) || 0,
      }));

      return {
        entries,
        totalParticipants: friendIds.length,
        lastUpdated: new Date().toISOString(),
      };
    }
  }

  private async getChallengeLeaderboard(
    challengeId: string,
    limit: number,
  ): Promise<LeaderboardCacheData> {
    const leaderboard = await this.userChallengeRepository.find({
      where: { challenge: { id: challengeId } },
      relations: ['user', 'challenge'],
      order: { currentProgress: 'DESC' },
      take: limit,
    });

    const entries = leaderboard.map((uc, index) => ({
      rank: index + 1,
      user: this.mapToLeaderboardUser(uc.user),
      score: uc.currentProgress,
      percentage: uc.completionPercentage,
    }));

    return {
      entries,
      totalParticipants: leaderboard.length,
      lastUpdated: new Date().toISOString(),
    };
  }

  private async getGlobalUserRank(
    userId: string,
    period: LeaderboardPeriod,
  ): Promise<UserRankResponseDto> {
    const dateRange = this.getDateRange(period);
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      return {
        rank: null,
        totalParticipants: 0,
        score: 0,
        change: 0,
        period,
      };
    }

    if (period === LeaderboardPeriod.ALL_TIME) {
      const totalUsers = await this.userRepository.count({
        where: { isActive: true },
      });
      const betterUsers = await this.userRepository.count({
        where: {
          isActive: true,
          totalSteps: user.totalSteps ? MoreThan(user.totalSteps) : MoreThan(0),
        },
      });

      return {
        rank: betterUsers + 1,
        totalParticipants: totalUsers,
        score: user.totalSteps,
        change: 0, // Would need historical data
        period,
      };
    } else {
      // Calculate user's score for the period
      const userHealthData = await this.healthDataRepository
        .createQueryBuilder('health')
        .select('SUM(health.steps)', 'totalSteps')
        .where('health.userId = :userId', { userId })
        .andWhere('health.date BETWEEN :startDate AND :endDate', {
          startDate: dateRange.start,
          endDate: dateRange.end,
        })
        .getRawOne();

      const userScore = parseInt(userHealthData?.totalSteps) || 0;

      // Count users with better scores
      const betterUsersCount = await this.healthDataRepository
        .createQueryBuilder('health')
        .innerJoin('health.user', 'user')
        .select('health.userId')
        .addSelect('SUM(health.steps)', 'totalSteps')
        .where('user.isActive = :isActive', { isActive: true })
        .andWhere('health.date BETWEEN :startDate AND :endDate', {
          startDate: dateRange.start,
          endDate: dateRange.end,
        })
        .groupBy('health.userId')
        .having('SUM(health.steps) > :userScore', { userScore })
        .getCount();

      // Get total participants
      const totalParticipants = await this.healthDataRepository
        .createQueryBuilder('health')
        .innerJoin('health.user', 'user')
        .select('DISTINCT health.userId')
        .where('user.isActive = :isActive', { isActive: true })
        .andWhere('health.date BETWEEN :startDate AND :endDate', {
          startDate: dateRange.start,
          endDate: dateRange.end,
        })
        .getCount();

      return {
        rank: userScore > 0 ? betterUsersCount + 1 : null,
        totalParticipants,
        score: userScore,
        change: 0, // Would need previous period data
        period,
      };
    }
  }

  private async getFriendsUserRank(
    userId: string,
    period: LeaderboardPeriod,
  ): Promise<UserRankResponseDto> {
    // Get user's friends
    const friendships = await this.friendshipRepository.find({
      where: [
        { requesterId: userId, status: FriendshipStatus.ACCEPTED },
        { addresseeId: userId, status: FriendshipStatus.ACCEPTED },
      ],
    });

    const friendIds = friendships.map((f) =>
      f.requesterId === userId ? f.addresseeId : f.requesterId,
    );
    friendIds.push(userId); // Include the user

    if (friendIds.length <= 1) {
      return {
        rank: 1,
        totalParticipants: 1,
        score: 0,
        change: 0,
        period,
      };
    }

    const dateRange = this.getDateRange(period);
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      return {
        rank: null,
        totalParticipants: friendIds.length,
        score: 0,
        change: 0,
        period,
      };
    }

    if (period === LeaderboardPeriod.ALL_TIME) {
      // Use query builder for IN clause
      const betterFriends = await this.userRepository
        .createQueryBuilder('user')
        .where('user.id IN (:...friendIds)', {
          friendIds: friendIds.filter((id) => id !== userId),
        })
        .andWhere('user.isActive = :isActive', { isActive: true })
        .andWhere('user.totalSteps > :userSteps', {
          userSteps: user.totalSteps || 0,
        })
        .getCount();

      return {
        rank: betterFriends + 1,
        totalParticipants: friendIds.length,
        score: user.totalSteps,
        change: 0,
        period,
      };
    } else {
      // Calculate user's score for the period
      const userHealthData = await this.healthDataRepository
        .createQueryBuilder('health')
        .select('SUM(health.steps)', 'totalSteps')
        .where('health.userId = :userId', { userId })
        .andWhere('health.date BETWEEN :startDate AND :endDate', {
          startDate: dateRange.start,
          endDate: dateRange.end,
        })
        .getRawOne();

      const userScore = parseInt(userHealthData?.totalSteps) || 0;

      // Count friends with better scores
      const betterFriendsCount = await this.healthDataRepository
        .createQueryBuilder('health')
        .innerJoin('health.user', 'user')
        .select('health.userId')
        .addSelect('SUM(health.steps)', 'totalSteps')
        .where('health.userId IN (:...friendIds)', {
          friendIds: friendIds.filter((id) => id !== userId),
        })
        .andWhere('user.isActive = :isActive', { isActive: true })
        .andWhere('health.date BETWEEN :startDate AND :endDate', {
          startDate: dateRange.start,
          endDate: dateRange.end,
        })
        .groupBy('health.userId')
        .having('SUM(health.steps) > :userScore', { userScore })
        .getCount();

      return {
        rank: userScore > 0 ? betterFriendsCount + 1 : friendIds.length,
        totalParticipants: friendIds.length,
        score: userScore,
        change: 0,
        period,
      };
    }
  }

  private getDateRange(period: LeaderboardPeriod): { start: Date; end: Date } {
    const now = new Date();
    let start: Date;

    switch (period) {
      case LeaderboardPeriod.DAILY:
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case LeaderboardPeriod.WEEKLY:
        const dayOfWeek = now.getDay();
        start = new Date(now.getTime() - dayOfWeek * 24 * 60 * 60 * 1000);
        start.setHours(0, 0, 0, 0);
        break;
      case LeaderboardPeriod.MONTHLY:
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      default:
        start = new Date(0); // All time
    }

    return { start, end: now };
  }

  private generateCacheKey(
    type: LeaderboardType,
    period: LeaderboardPeriod,
    challengeId?: string,
    limit?: number,
  ): string {
    const baseKey = `leaderboard:${type}:${period}:${limit || 50}`;
    return challengeId ? `${baseKey}:${challengeId}` : baseKey;
  }

  private generateLeaderboardId(
    type: LeaderboardType,
    period: LeaderboardPeriod,
    challengeId?: string,
  ): string {
    const baseId = `${type.toLowerCase()}-${period.toLowerCase()}`;
    return challengeId ? `challenge-${challengeId}` : baseId;
  }

  private generateLeaderboardName(
    type: LeaderboardType,
    period: LeaderboardPeriod,
  ): string {
    if (type === LeaderboardType.CHALLENGE) {
      return 'Challenge Leaderboard';
    }
    return `${type} ${period} Leaderboard`;
  }

  private findUserRank(
    entries: LeaderboardEntryDto[],
    userId: string,
  ): number | null {
    const userEntry = entries.find((entry) => entry.user.id === userId);
    return userEntry ? userEntry.rank : null;
  }

  private mapToLeaderboardUser(user: User): LeaderboardUserDto {
    return {
      id: user.id,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      avatarUrl: user.avatarUrl,
    };
  }

  // Cache invalidation methods
  async invalidateLeaderboardCache(
    type?: LeaderboardType,
    period?: LeaderboardPeriod,
  ): Promise<void> {
    // Simple implementation - delete specific patterns
    const patterns = ['leaderboard:*'];
    if (type && period) {
      patterns.push(`leaderboard:${type}:${period}*`);
    }

    for (const pattern of patterns) {
      try {
        await this.cacheManager.del(pattern);
      } catch (error) {
        console.warn(`Failed to delete cache pattern ${pattern}:`, error);
      }
    }
  }

  async invalidateUserRankCache(userId: string): Promise<void> {
    const patterns = [
      `user-rank:${userId}:Global:Daily`,
      `user-rank:${userId}:Global:Weekly`,
      `user-rank:${userId}:Global:Monthly`,
      `user-rank:${userId}:Friends:Daily`,
      `user-rank:${userId}:Friends:Weekly`,
      `user-rank:${userId}:Friends:Monthly`,
    ];

    for (const key of patterns) {
      try {
        await this.cacheManager.del(key);
      } catch (error) {
        console.warn(`Failed to delete cache key ${key}:`, error);
      }
    }
  }
}
