import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { Reward, RewardStatus } from './entities/reward.entity';
import { UserReward, UserRewardStatus, AcquisitionType } from './entities/user-reward.entity';
import { PointsTransaction, TransactionType, TransactionSource } from './entities/points-transaction.entity';
import { User } from '../users/entities/user.entity';
import { RewardQueryDto } from './dto/reward-query.dto';
import {
  UserRewardWithDetailsDto,
  PointsBalanceDto,
  RedeemRewardResponseDto,
  RewardListResponseDto,
} from './dto/reward-response.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/entities/notification.entity';
import { randomBytes } from 'crypto';

@Injectable()
export class RewardsService {
  private readonly logger = new Logger(RewardsService.name);

  constructor(
    @InjectRepository(Reward)
    private readonly rewardRepository: Repository<Reward>,
    @InjectRepository(UserReward)
    private readonly userRewardRepository: Repository<UserReward>,
    @InjectRepository(PointsTransaction)
    private readonly pointsTransactionRepository: Repository<PointsTransaction>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Get user rewards with filtering and pagination
   */
  async getUserRewards(
    userId: string,
    filters: RewardQueryDto,
  ): Promise<RewardListResponseDto> {
    try {
      const { type, status, isPurchasable, isEarnable, limit = 20, offset = 0 } = filters;

      const queryBuilder = this.userRewardRepository
        .createQueryBuilder('userReward')
        .leftJoinAndSelect('userReward.reward', 'reward')
        .where('userReward.userId = :userId', { userId });

      if (status) {
        queryBuilder.andWhere('userReward.status = :status', { status });
      }

      if (type) {
        queryBuilder.andWhere('reward.type = :type', { type });
      }

      if (isPurchasable !== undefined) {
        queryBuilder.andWhere('reward.isPurchasable = :isPurchasable', { isPurchasable });
      }

      if (isEarnable !== undefined) {
        queryBuilder.andWhere('reward.isEarnable = :isEarnable', { isEarnable });
      }

      queryBuilder
        .orderBy('userReward.earnedAt', 'DESC')
        .skip(offset)
        .take(limit);

      const [userRewards, total] = await queryBuilder.getManyAndCount();

      const rewardsWithDetails = userRewards.map((userReward) =>
        this.enhanceUserRewardData(userReward),
      );

      return {
        rewards: rewardsWithDetails,
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      };
    } catch (error) {
      this.logger.error(`Failed to get user rewards for user ${userId}:`, error);
      throw new InternalServerErrorException('Failed to retrieve user rewards');
    }
  }

  /**
   * Get available rewards for purchase
   */
  async getAvailableRewards(filters: RewardQueryDto): Promise<Reward[]> {
    try {
      const where: FindOptionsWhere<Reward> = {
        status: RewardStatus.ACTIVE,
      };

      if (filters.type) {
        where.type = filters.type;
      }

      if (filters.isPurchasable !== undefined) {
        where.isPurchasable = filters.isPurchasable;
      }

      if (filters.isEarnable !== undefined) {
        where.isEarnable = filters.isEarnable;
      }

      return await this.rewardRepository.find({
        where,
        order: { createdAt: 'DESC' },
        take: filters.limit || 20,
        skip: filters.offset || 0,
      });
    } catch (error) {
      this.logger.error('Failed to get available rewards:', error);
      throw new InternalServerErrorException('Failed to retrieve available rewards');
    }
  }

  /**
   * Purchase a reward with points
   */
  async purchaseReward(userId: string, rewardId: string): Promise<UserReward> {
    try {
      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (!user) {
        throw new NotFoundException('User not found');
      }

      const reward = await this.rewardRepository.findOne({ where: { id: rewardId } });
      if (!reward) {
        throw new NotFoundException('Reward not found');
      }

      if (!reward.isPurchasable) {
        throw new BadRequestException('This reward is not available for purchase');
      }

      if (reward.status !== RewardStatus.ACTIVE) {
        throw new BadRequestException('This reward is not available');
      }

      if (user.points < reward.pointsCost) {
        throw new BadRequestException('Insufficient points');
      }

      if (reward.maxRedemptions && reward.currentRedemptions >= reward.maxRedemptions) {
        throw new BadRequestException('This reward is no longer available');
      }

      // Create user reward
      const userReward = this.userRewardRepository.create({
        userId,
        rewardId,
        status: UserRewardStatus.AVAILABLE,
        acquisitionType: AcquisitionType.PURCHASED,
        pointsSpent: reward.pointsCost,
        earnedReason: `Purchased with ${reward.pointsCost} points`,
        expiresAt: reward.expiryDate,
        redeemCode: this.generateRedeemCode(),
      });

      await this.userRewardRepository.save(userReward);

      // Deduct points and create transaction
      await this.spendPoints(
        userId,
        reward.pointsCost,
        TransactionSource.REWARD_PURCHASE,
        `Purchased reward: ${reward.title}`,
        rewardId,
      );

      // Update reward redemption count
      await this.rewardRepository.update(rewardId, {
        currentRedemptions: reward.currentRedemptions + 1,
      });

      // Send notification
      await this.notificationsService.createNotification({
        userId,
        title: 'Reward Purchased!',
        message: `You've successfully purchased ${reward.title} for ${reward.pointsCost} points.`,
        type: NotificationType.SYSTEM,
        data: { rewardId, userRewardId: userReward.id },
      });

      this.logger.log(`User ${userId} purchased reward ${rewardId} for ${reward.pointsCost} points`);

      const result = await this.userRewardRepository.findOne({
        where: { id: userReward.id },
        relations: ['reward'],
      });

      if (!result) {
        throw new InternalServerErrorException('Failed to retrieve purchased reward');
      }

      return result;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Failed to purchase reward ${rewardId} for user ${userId}:`, error);
      throw new InternalServerErrorException('Failed to purchase reward');
    }
  }

  /**
   * Redeem a user reward
   */
  async redeemReward(rewardId: string, userId: string): Promise<RedeemRewardResponseDto> {
    try {
      const userReward = await this.userRewardRepository.findOne({
        where: { id: rewardId, userId },
        relations: ['reward'],
      });

      if (!userReward) {
        throw new NotFoundException('Reward not found');
      }

      if (userReward.status === UserRewardStatus.REDEEMED) {
        throw new BadRequestException('This reward has already been redeemed');
      }

      if (userReward.status === UserRewardStatus.EXPIRED) {
        throw new BadRequestException('This reward has expired');
      }

      if (userReward.expiresAt && new Date() > userReward.expiresAt) {
        // Mark as expired
        await this.userRewardRepository.update(rewardId, {
          status: UserRewardStatus.EXPIRED,
        });
        throw new BadRequestException('This reward has expired');
      }

      // Update reward status
      const redeemedAt = new Date();
      await this.userRewardRepository.update(rewardId, {
        status: UserRewardStatus.REDEEMED,
        redeemedAt,
      });

      // Send notification
      await this.notificationsService.createNotification({
        userId,
        title: 'Reward Redeemed!',
        message: `You've successfully redeemed ${userReward.reward.title}.`,
        type: NotificationType.SYSTEM,
        data: { rewardId: userReward.reward.id, userRewardId: rewardId },
      });

      this.logger.log(`User ${userId} redeemed reward ${rewardId}`);

      return {
        redeemCode: userReward.redeemCode,
        instructions: userReward.reward.redemptionInstructions || 'Reward redeemed successfully!',
        redemptionData: userReward.redemptionData,
        redeemedAt,
      };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Failed to redeem reward ${rewardId} for user ${userId}:`, error);
      throw new InternalServerErrorException('Failed to redeem reward');
    }
  }

  /**
   * Get user's points balance and statistics
   */
  async getPointsBalance(userId: string): Promise<PointsBalanceDto> {
    try {
      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (!user) {
        throw new NotFoundException('User not found');
      }

      const transactions = await this.pointsTransactionRepository.find({
        where: { userId },
        order: { createdAt: 'DESC' },
      });

      let lifetimeEarned = 0;
      let lifetimeSpent = 0;

      transactions.forEach((transaction) => {
        if (transaction.type === TransactionType.EARNED || transaction.type === TransactionType.GRANTED) {
          lifetimeEarned += transaction.amount;
        } else if (transaction.type === TransactionType.SPENT) {
          lifetimeSpent += transaction.amount;
        }
      });

      // Calculate points needed for next level (simple formula: level * 1000)
      const pointsToNextLevel = Math.max(0, (user.level * 1000) - user.experience);

      return {
        totalPoints: user.points,
        availablePoints: user.points,
        lifetimeEarned,
        lifetimeSpent,
        level: user.level,
        pointsToNextLevel,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to get points balance for user ${userId}:`, error);
      throw new InternalServerErrorException('Failed to retrieve points balance');
    }
  }

  /**
   * Award points to a user
   */
  async awardPoints(
    userId: string,
    points: number,
    source: TransactionSource,
    reason: string,
    sourceId?: string,
  ): Promise<void> {
    try {
      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (!user) {
        throw new NotFoundException('User not found');
      }

      const balanceBefore = user.points;
      const balanceAfter = balanceBefore + points;

      // Create transaction
      const transaction = this.pointsTransactionRepository.create({
        userId,
        type: TransactionType.EARNED,
        amount: points,
        source,
        sourceId,
        description: reason,
        balanceBefore,
        balanceAfter,
      });

      await this.pointsTransactionRepository.save(transaction);

      // Update user points
      await this.userRepository.update(userId, { points: balanceAfter });

      this.logger.log(`Awarded ${points} points to user ${userId}: ${reason}`);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to award points to user ${userId}:`, error);
      throw new InternalServerErrorException('Failed to award points');
    }
  }

  /**
   * Spend points for a user
   */
  async spendPoints(
    userId: string,
    points: number,
    source: TransactionSource,
    reason: string,
    sourceId?: string,
  ): Promise<void> {
    try {
      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (!user) {
        throw new NotFoundException('User not found');
      }

      if (user.points < points) {
        throw new BadRequestException('Insufficient points');
      }

      const balanceBefore = user.points;
      const balanceAfter = balanceBefore - points;

      // Create transaction
      const transaction = this.pointsTransactionRepository.create({
        userId,
        type: TransactionType.SPENT,
        amount: points,
        source,
        sourceId,
        description: reason,
        balanceBefore,
        balanceAfter,
      });

      await this.pointsTransactionRepository.save(transaction);

      // Update user points
      await this.userRepository.update(userId, { points: balanceAfter });

      this.logger.log(`User ${userId} spent ${points} points: ${reason}`);
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Failed to spend points for user ${userId}:`, error);
      throw new InternalServerErrorException('Failed to spend points');
    }
  }

  /**
   * Grant a reward to user (for achievements, challenges, etc.)
   */
  async grantReward(
    userId: string,
    rewardId: string,
    acquisitionType: AcquisitionType,
    earnedFrom?: string,
    earnedReason?: string,
  ): Promise<UserReward> {
    try {
      const reward = await this.rewardRepository.findOne({ where: { id: rewardId } });
      if (!reward) {
        throw new NotFoundException('Reward not found');
      }

      const userReward = this.userRewardRepository.create({
        userId,
        rewardId,
        status: UserRewardStatus.AVAILABLE,
        acquisitionType,
        earnedFrom,
        earnedReason: earnedReason || `Earned ${reward.title}`,
        expiresAt: reward.expiryDate,
        redeemCode: this.generateRedeemCode(),
      });

      await this.userRewardRepository.save(userReward);

      // Send notification
      await this.notificationsService.createNotification({
        userId,
        title: 'New Reward Earned!',
        message: `You've earned a new reward: ${reward.title}`,
        type: NotificationType.ACHIEVEMENT,
        data: { rewardId, userRewardId: userReward.id },
      });

      this.logger.log(`Granted reward ${rewardId} to user ${userId}: ${earnedReason}`);

      return userReward;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to grant reward ${rewardId} to user ${userId}:`, error);
      throw new InternalServerErrorException('Failed to grant reward');
    }
  }

  /**
   * Check and update expired rewards
   */
  async updateExpiredRewards(): Promise<void> {
    try {
      const expiredRewards = await this.userRewardRepository
        .createQueryBuilder('userReward')
        .where('userReward.status = :status', { status: UserRewardStatus.AVAILABLE })
        .andWhere('userReward.expiresAt <= :now', { now: new Date() })
        .getMany();

      if (expiredRewards.length > 0) {
        await this.userRewardRepository.update(
          { id: In(expiredRewards.map(r => r.id)) },
          { status: UserRewardStatus.EXPIRED },
        );

        this.logger.log(`Marked ${expiredRewards.length} rewards as expired`);
      }
    } catch (error) {
      this.logger.error('Failed to update expired rewards:', error);
    }
  }

  /**
   * Helper method to enhance user reward data
   */
  private enhanceUserRewardData(userReward: UserReward): UserRewardWithDetailsDto {
    const now = new Date();
    const isExpired = userReward.expiresAt ? now > userReward.expiresAt : false;
    const daysUntilExpiry = userReward.expiresAt
      ? Math.ceil((userReward.expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      : undefined;

    const canRedeem = 
      userReward.status === UserRewardStatus.AVAILABLE && 
      !isExpired;

    return {
      ...userReward,
      daysUntilExpiry,
      canRedeem,
      isExpired,
    };
  }

  /**
   * Generate a unique redeem code
   */
  private generateRedeemCode(): string {
    return randomBytes(8).toString('hex').toUpperCase();
  }
}

// Import In operator for expired rewards query
import { In } from 'typeorm';
