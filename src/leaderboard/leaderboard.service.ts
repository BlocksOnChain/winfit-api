import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { UserChallenge } from '../challenges/entities/user-challenge.entity';
import { HealthData } from '../health/entities/health-data.entity';

interface LeaderboardOptions {
  type: string;
  period: string;
  challengeId?: string;
  limit: number;
  userId: string;
}

interface LeaderboardEntry {
  rank: number;
  user: {
    id: string;
    username: string;
    firstName: string;
    lastName: string;
    avatarUrl?: string;
  };
  score: number;
  change?: number;
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
  ) {}

  async getLeaderboard(options: LeaderboardOptions): Promise<any> {
    const { type, period, challengeId, limit, userId } = options;

    if (type === 'Challenge' && challengeId) {
      return this.getChallengeLeaderboard(challengeId, limit, userId);
    }

    if (type === 'Friends') {
      return this.getFriendsLeaderboard(userId, period, limit);
    }

    return this.getGlobalLeaderboard(period, limit, userId);
  }

  async getUserRank(userId: string, type: string, period: string): Promise<any> {
    if (type === 'Friends') {
      return this.getFriendsUserRank(userId, period);
    }

    return this.getGlobalUserRank(userId, period);
  }

  private async getGlobalLeaderboard(period: string, limit: number, userId: string): Promise<any> {
    const dateRange = this.getDateRange(period);
    
    // For now, we'll use total steps as the ranking criteria
    const queryBuilder = this.userRepository.createQueryBuilder('user')
      .select([
        'user.id',
        'user.username', 
        'user.firstName',
        'user.lastName',
        'user.avatarUrl',
        'user.totalSteps'
      ])
      .where('user.isActive = :isActive', { isActive: true })
      .orderBy('user.totalSteps', 'DESC')
      .limit(limit);

    const users = await queryBuilder.getMany();

    const entries: LeaderboardEntry[] = users.map((user, index) => ({
      rank: index + 1,
      user: {
        id: user.id,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        avatarUrl: user.avatarUrl,
      },
      score: user.totalSteps,
    }));

    const userRank = entries.findIndex(entry => entry.user.id === userId) + 1;

    return {
      id: 'global-leaderboard',
      name: 'Global Leaderboard',
      type: 'Global',
      period,
      entries,
      userRank: userRank || null,
      totalParticipants: users.length,
      lastUpdated: new Date().toISOString(),
    };
  }

  private async getFriendsLeaderboard(userId: string, period: string, limit: number): Promise<any> {
    // For now, return empty leaderboard as friends functionality is not implemented
    return {
      id: 'friends-leaderboard',
      name: 'Friends Leaderboard',
      type: 'Friends',
      period,
      entries: [],
      userRank: null,
      totalParticipants: 0,
      lastUpdated: new Date().toISOString(),
    };
  }

  private async getChallengeLeaderboard(challengeId: string, limit: number, userId: string): Promise<any> {
    const leaderboard = await this.userChallengeRepository.find({
      where: { challenge: { id: challengeId } },
      relations: ['user'],
      order: { currentProgress: 'DESC' },
      take: limit,
    });

    const entries: LeaderboardEntry[] = leaderboard.map((uc, index) => ({
      rank: index + 1,
      user: {
        id: uc.user.id,
        username: uc.user.username,
        firstName: uc.user.firstName,
        lastName: uc.user.lastName,
        avatarUrl: uc.user.avatarUrl,
      },
      score: uc.currentProgress,
    }));

    const userRank = entries.findIndex(entry => entry.user.id === userId) + 1;

    return {
      id: `challenge-${challengeId}`,
      name: 'Challenge Leaderboard',
      type: 'Challenge',
      period: 'Challenge',
      entries,
      userRank: userRank || null,
      totalParticipants: leaderboard.length,
      lastUpdated: new Date().toISOString(),
    };
  }

  private async getGlobalUserRank(userId: string, period: string): Promise<any> {
    const totalUsers = await this.userRepository.count({ where: { isActive: true } });
    const user = await this.userRepository.findOne({ where: { id: userId } });
    
    if (!user) {
      return {
        rank: null,
        totalParticipants: totalUsers,
        score: 0,
        change: 0,
      };
    }

    const betterUsers = await this.userRepository.count({
      where: {
        isActive: true,
        totalSteps: user.totalSteps ? { $gt: user.totalSteps } : undefined,
      },
    });

    return {
      rank: betterUsers + 1,
      totalParticipants: totalUsers,
      score: user.totalSteps,
      change: 0, // Would need historical data to calculate
    };
  }

  private async getFriendsUserRank(userId: string, period: string): Promise<any> {
    // Placeholder for friends ranking
    return {
      rank: null,
      totalParticipants: 0,
      score: 0,
      change: 0,
    };
  }

  private getDateRange(period: string): { start: Date; end: Date } {
    const now = new Date();
    let start: Date;

    switch (period) {
      case 'Daily':
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'Weekly':
        start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'Monthly':
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      default:
        start = new Date(0); // All time
    }

    return { start, end: now };
  }
} 