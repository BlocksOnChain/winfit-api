import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual, Between } from 'typeorm';
import {
  Achievement,
  RequirementType,
  AchievementCategory,
} from './entities/achievement.entity';
import { UserAchievement } from './entities/user-achievement.entity';
import { User } from '../users/entities/user.entity';
import { HealthData } from '../health/entities/health-data.entity';
import { UserChallenge } from '../challenges/entities/user-challenge.entity';
import {
  Friendship,
  FriendshipStatus,
} from '../friends/entities/friendship.entity';
import { AchievementResponseDto } from './dto/achievement-response.dto';
import { UserAchievementResponseDto } from './dto/user-achievement-response.dto';
import { AchievementProgressResponseDto } from './dto/achievement-progress-response.dto';
import { CreateAchievementDto } from './dto/create-achievement.dto';
import { AchievementQueryDto } from './dto/achievement-query.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/entities/notification.entity';
import { RewardsService } from '../rewards/rewards.service';
import { TransactionSource } from '../rewards/entities/points-transaction.entity';

@Injectable()
export class AchievementsService {
  private readonly logger = new Logger(AchievementsService.name);

  constructor(
    @InjectRepository(Achievement)
    private readonly achievementRepository: Repository<Achievement>,
    @InjectRepository(UserAchievement)
    private readonly userAchievementRepository: Repository<UserAchievement>,
    @InjectRepository(HealthData)
    private readonly healthDataRepository: Repository<HealthData>,
    @InjectRepository(UserChallenge)
    private readonly userChallengeRepository: Repository<UserChallenge>,
    @InjectRepository(Friendship)
    private readonly friendshipRepository: Repository<Friendship>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly notificationsService: NotificationsService,
    private readonly rewardsService: RewardsService,
  ) {}

  async getUserAchievements(
    userId: string,
    query?: AchievementQueryDto,
  ): Promise<UserAchievementResponseDto[]> {
    const queryBuilder = this.userAchievementRepository
      .createQueryBuilder('ua')
      .leftJoinAndSelect('ua.achievement', 'achievement')
      .where('ua.user_id = :userId', { userId })
      .orderBy('ua.unlocked_at', 'DESC');

    if (query?.category) {
      queryBuilder.andWhere('achievement.category = :category', {
        category: query.category,
      });
    }

    if (query?.isActive !== undefined) {
      queryBuilder.andWhere('achievement.is_active = :isActive', {
        isActive: query.isActive,
      });
    }

    const userAchievements = await queryBuilder.getMany();

    return userAchievements.map((ua) =>
      UserAchievementResponseDto.fromUserAchievement(ua),
    );
  }

  async getAvailableAchievements(
    query?: AchievementQueryDto,
  ): Promise<AchievementResponseDto[]> {
    const queryBuilder =
      this.achievementRepository.createQueryBuilder('achievement');

    if (query?.category) {
      queryBuilder.andWhere('achievement.category = :category', {
        category: query.category,
      });
    }

    if (query?.isActive !== undefined) {
      queryBuilder.andWhere('achievement.is_active = :isActive', {
        isActive: query.isActive,
      });
    } else {
      queryBuilder.andWhere('achievement.is_active = :isActive', {
        isActive: true,
      });
    }

    queryBuilder
      .orderBy('achievement.category', 'ASC')
      .addOrderBy('achievement.title', 'ASC');

    const achievements = await queryBuilder.getMany();
    return achievements.map((achievement) =>
      AchievementResponseDto.fromEntity(achievement),
    );
  }

  /**
   * Enhanced method to check and unlock achievements with points system integration
   */
  async checkAndUnlockAchievements(user: User): Promise<UserAchievement[]> {
    const unlockedAchievements: UserAchievement[] = [];

    try {
      // Get all active achievements that the user hasn't unlocked yet
      const availableAchievements = await this.achievementRepository.find({
        where: { isActive: true },
      });

      const userAchievements = await this.userAchievementRepository.find({
        where: { user: { id: user.id } },
        relations: ['achievement'],
      });

      const unlockedAchievementIds = userAchievements.map(
        (ua) => ua.achievement.id,
      );

      for (const achievement of availableAchievements) {
        if (unlockedAchievementIds.includes(achievement.id)) {
          continue; // Already unlocked
        }

        if (await this.checkAchievementRequirement(user, achievement)) {
          const userAchievement = await this.unlockAchievementForUser(
            user,
            achievement,
          );
          unlockedAchievements.push(userAchievement);
        }
      }

      this.logger.log(
        `Unlocked ${unlockedAchievements.length} achievements for user ${user.id}`,
      );
    } catch (error) {
      this.logger.error(
        `Error checking achievements for user ${user.id}:`,
        error,
      );
    }

    return unlockedAchievements;
  }

  /**
   * Main entry point for health data sync integration
   */
  async processAchievementsFromHealthSync(
    userId: string,
    healthData: HealthData,
  ): Promise<UserAchievement[]> {
    try {
      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (!user) {
        this.logger.error(`User not found: ${userId}`);
        return [];
      }

      return await this.checkAndUnlockAchievements(user);
    } catch (error) {
      this.logger.error(
        `Error processing achievements from health sync for user ${userId}:`,
        error,
      );
      return [];
    }
  }

  private async unlockAchievementForUser(
    user: User,
    achievement: Achievement,
  ): Promise<UserAchievement> {
    const userAchievement = this.userAchievementRepository.create({
      user,
      achievement,
      unlockedAt: new Date(),
    });

    const saved = await this.userAchievementRepository.save(userAchievement);

    // Award points to user if specified
    if (achievement.pointsReward > 0) {
      await this.awardPointsToUser(user.id, achievement.pointsReward, achievement.id);
    }

    // Send achievement notification
    try {
      await this.notificationsService.createAchievementNotification(
        user.id,
        achievement.title,
        achievement.pointsReward,
        achievement.id,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send achievement notification for user ${user.id}:`,
        error,
      );
    }

    this.logger.log(
      `User ${user.id} unlocked achievement "${achievement.title}" and earned ${achievement.pointsReward} points`,
    );

    return saved;
  }

  private async awardPointsToUser(
    userId: string,
    points: number,
    achievementId?: string,
  ): Promise<void> {
    try {
      // Award experience points (existing system)
      await this.userRepository.increment({ id: userId }, 'experience', points);

      // Award reward points (new system)
      await this.rewardsService.awardPoints(
        userId,
        points,
        TransactionSource.ACHIEVEMENT,
        `Achievement reward: ${points} points`,
        achievementId,
      );

      // Check if user should level up
      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (user) {
        const newLevel = this.calculateLevel(user.experience);
        if (newLevel > user.level) {
          await this.userRepository.update(userId, { level: newLevel });
          this.logger.log(`User ${userId} leveled up to level ${newLevel}`);
        }
      }
    } catch (error) {
      this.logger.error(`Error awarding points to user ${userId}:`, error);
    }
  }

  private calculateLevel(experience: number): number {
    // Level formula: level = floor(sqrt(experience / 100)) + 1
    return Math.floor(Math.sqrt(experience / 100)) + 1;
  }

  private async checkAchievementRequirement(
    user: User,
    achievement: Achievement,
  ): Promise<boolean> {
    if (
      !achievement.requirementType ||
      achievement.requirementValue === undefined
    ) {
      return false;
    }

    try {
      switch (achievement.requirementType) {
        case RequirementType.TOTAL_STEPS:
          return user.totalSteps >= achievement.requirementValue;

        case RequirementType.TOTAL_DISTANCE:
          return user.totalDistance >= achievement.requirementValue;

        case RequirementType.USER_LEVEL:
          return user.level >= achievement.requirementValue;

        case RequirementType.DAILY_STEPS:
          return await this.checkDailySteps(
            user.id,
            achievement.requirementValue,
          );

        case RequirementType.CHALLENGES_COMPLETED:
          return await this.checkChallengesCompleted(
            user.id,
            achievement.requirementValue,
          );

        case RequirementType.FRIENDS_COUNT:
          return await this.checkFriendsCount(
            user.id,
            achievement.requirementValue,
          );

        default:
          return false;
      }
    } catch (error) {
      this.logger.error(
        `Error checking requirement for achievement ${achievement.id}:`,
        error,
      );
      return false;
    }
  }

  private async checkDailySteps(
    userId: string,
    requiredSteps: number,
  ): Promise<boolean> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayHealthData = await this.healthDataRepository.findOne({
      where: {
        user: { id: userId },
        date: today,
      },
    });

    return todayHealthData ? todayHealthData.steps >= requiredSteps : false;
  }

  private async checkChallengesCompleted(
    userId: string,
    requiredCount: number,
  ): Promise<boolean> {
    const completedChallenges = await this.userChallengeRepository.count({
      where: {
        user: { id: userId },
        isCompleted: true,
      },
    });

    return completedChallenges >= requiredCount;
  }

  private async checkFriendsCount(
    userId: string,
    requiredCount: number,
  ): Promise<boolean> {
    const friendsCount = await this.friendshipRepository.count({
      where: [
        {
          requester: { id: userId },
          status: FriendshipStatus.ACCEPTED,
        },
        {
          addressee: { id: userId },
          status: FriendshipStatus.ACCEPTED,
        },
      ],
    });

    return friendsCount >= requiredCount;
  }

  async unlockAchievement(
    userId: string,
    achievementId: string,
  ): Promise<UserAchievement> {
    const achievement = await this.achievementRepository.findOne({
      where: { id: achievementId },
    });

    if (!achievement) {
      throw new Error('Achievement not found');
    }

    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new Error('User not found');
    }

    return this.unlockAchievementForUser(user, achievement);
  }

  async getUserAchievementProgress(
    userId: string,
    query?: AchievementQueryDto,
  ): Promise<AchievementProgressResponseDto[]> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    const allAchievements = await this.getAvailableAchievements(query);
    const userAchievements = await this.userAchievementRepository.find({
      where: { user: { id: userId } },
      relations: ['achievement'],
      order: { unlockedAt: 'DESC' },
    });

    const unlockedAchievementMap = new Map();
    userAchievements.forEach((ua) => {
      unlockedAchievementMap.set(ua.achievement.id, ua.unlockedAt);
    });

    const progress: AchievementProgressResponseDto[] = [];

    for (const achievementDto of allAchievements) {
      const isUnlocked = unlockedAchievementMap.has(achievementDto.id);
      let currentProgress = 0;
      let currentValue: number | undefined;
      let progressDescription: string | undefined;

      // Apply filters
      if (query?.unlockedOnly && !isUnlocked) continue;
      if (query?.lockedOnly && isUnlocked) continue;

      if (
        !isUnlocked &&
        achievementDto.requirementType &&
        achievementDto.requirementValue
      ) {
        const progressData = await this.calculateProgress(user, achievementDto);
        currentProgress = progressData.progress;
        currentValue = progressData.currentValue;
        progressDescription = progressData.description;
      }

      const progressDto = new AchievementProgressResponseDto();
      Object.assign(progressDto, achievementDto);
      progressDto.isUnlocked = isUnlocked;
      progressDto.progress = isUnlocked ? 1 : currentProgress;
      progressDto.currentValue = currentValue;
      progressDto.unlockedAt = isUnlocked
        ? unlockedAchievementMap.get(achievementDto.id)
        : undefined;
      progressDto.progressDescription = progressDescription;

      progress.push(progressDto);
    }

    return progress;
  }

  private async calculateProgress(
    user: User,
    achievement: AchievementResponseDto,
  ): Promise<{
    progress: number;
    currentValue?: number;
    description?: string;
  }> {
    if (!achievement.requirementType || !achievement.requirementValue) {
      return { progress: 0 };
    }

    switch (achievement.requirementType) {
      case RequirementType.TOTAL_STEPS:
        const stepsProgress = Math.min(
          user.totalSteps / achievement.requirementValue,
          1,
        );
        return {
          progress: stepsProgress,
          currentValue: user.totalSteps,
          description: `${user.totalSteps.toLocaleString()} / ${achievement.requirementValue.toLocaleString()} steps`,
        };

      case RequirementType.TOTAL_DISTANCE:
        const distanceProgress = Math.min(
          user.totalDistance / achievement.requirementValue,
          1,
        );
        return {
          progress: distanceProgress,
          currentValue: user.totalDistance,
          description: `${(user.totalDistance / 1000).toFixed(1)} / ${(achievement.requirementValue / 1000).toFixed(1)} km`,
        };

      case RequirementType.USER_LEVEL:
        const levelProgress = Math.min(
          user.level / achievement.requirementValue,
          1,
        );
        return {
          progress: levelProgress,
          currentValue: user.level,
          description: `Level ${user.level} / ${achievement.requirementValue}`,
        };

      case RequirementType.DAILY_STEPS:
        const todayHealthData = await this.getTodayHealthData(user.id);
        const dailySteps = todayHealthData?.steps || 0;
        const dailyProgress = Math.min(
          dailySteps / achievement.requirementValue,
          1,
        );
        return {
          progress: dailyProgress,
          currentValue: dailySteps,
          description: `${dailySteps.toLocaleString()} / ${achievement.requirementValue.toLocaleString()} steps today`,
        };

      case RequirementType.CHALLENGES_COMPLETED:
        const completedCount = await this.userChallengeRepository.count({
          where: { user: { id: user.id }, isCompleted: true },
        });
        const challengeProgress = Math.min(
          completedCount / achievement.requirementValue,
          1,
        );
        return {
          progress: challengeProgress,
          currentValue: completedCount,
          description: `${completedCount} / ${achievement.requirementValue} challenges completed`,
        };

      case RequirementType.FRIENDS_COUNT:
        const friendsCount = await this.friendshipRepository.count({
          where: [
            { requester: { id: user.id }, status: FriendshipStatus.ACCEPTED },
            { addressee: { id: user.id }, status: FriendshipStatus.ACCEPTED },
          ],
        });
        const friendProgress = Math.min(
          friendsCount / achievement.requirementValue,
          1,
        );
        return {
          progress: friendProgress,
          currentValue: friendsCount,
          description: `${friendsCount} / ${achievement.requirementValue} friends`,
        };

      default:
        return { progress: 0 };
    }
  }

  private async getTodayHealthData(userId: string): Promise<HealthData | null> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return this.healthDataRepository.findOne({
      where: {
        user: { id: userId },
        date: today,
      },
    });
  }

  // Admin methods
  async createAchievement(
    createAchievementDto: CreateAchievementDto,
  ): Promise<AchievementResponseDto> {
    const achievement = this.achievementRepository.create({
      ...createAchievementDto,
      pointsReward: createAchievementDto.pointsReward || 0,
      isActive:
        createAchievementDto.isActive !== undefined
          ? createAchievementDto.isActive
          : true,
    });

    const saved = await this.achievementRepository.save(achievement);
    return AchievementResponseDto.fromEntity(saved);
  }

  async updateAchievement(
    id: string,
    updateData: Partial<CreateAchievementDto>,
  ): Promise<AchievementResponseDto> {
    const achievement = await this.achievementRepository.findOne({
      where: { id },
    });
    if (!achievement) {
      throw new Error('Achievement not found');
    }

    Object.assign(achievement, updateData);
    const saved = await this.achievementRepository.save(achievement);
    return AchievementResponseDto.fromEntity(saved);
  }

  async deleteAchievement(id: string): Promise<void> {
    const result = await this.achievementRepository.delete(id);
    if (result.affected === 0) {
      throw new Error('Achievement not found');
    }
  }

  /**
   * Seed initial achievements for the platform
   */
  async seedInitialAchievements(): Promise<void> {
    const existingCount = await this.achievementRepository.count();
    if (existingCount > 0) {
      this.logger.log('Achievements already seeded, skipping...');
      return;
    }

    const initialAchievements = [
      // Steps Achievements
      {
        title: 'First Steps',
        description: 'Take your first 1,000 steps',
        category: AchievementCategory.STEPS,
        requirementType: RequirementType.TOTAL_STEPS,
        requirementValue: 1000,
        pointsReward: 50,
        icon: 'achievement-first-steps',
      },
      {
        title: 'Walking Warrior',
        description: 'Reach 10,000 total steps',
        category: AchievementCategory.STEPS,
        requirementType: RequirementType.TOTAL_STEPS,
        requirementValue: 10000,
        pointsReward: 100,
        icon: 'achievement-walking-warrior',
      },
      {
        title: 'Daily Walker',
        description: 'Walk 5,000 steps in a single day',
        category: AchievementCategory.STEPS,
        requirementType: RequirementType.DAILY_STEPS,
        requirementValue: 5000,
        pointsReward: 75,
        icon: 'achievement-daily-walker',
      },
      {
        title: 'Step Master',
        description: 'Walk 10,000 steps in a single day',
        category: AchievementCategory.STEPS,
        requirementType: RequirementType.DAILY_STEPS,
        requirementValue: 10000,
        pointsReward: 150,
        icon: 'achievement-step-master',
      },
      // Distance Achievements
      {
        title: 'First Kilometer',
        description: 'Walk your first kilometer',
        category: AchievementCategory.DISTANCE,
        requirementType: RequirementType.TOTAL_DISTANCE,
        requirementValue: 1000, // 1km in meters
        pointsReward: 50,
        icon: 'achievement-first-km',
      },
      {
        title: 'Marathon Walker',
        description: 'Walk a total of 42.2 kilometers',
        category: AchievementCategory.DISTANCE,
        requirementType: RequirementType.TOTAL_DISTANCE,
        requirementValue: 42200,
        pointsReward: 500,
        icon: 'achievement-marathon',
      },
      // Challenge Achievements
      {
        title: 'Challenge Accepted',
        description: 'Complete your first challenge',
        category: AchievementCategory.CHALLENGES,
        requirementType: RequirementType.CHALLENGES_COMPLETED,
        requirementValue: 1,
        pointsReward: 100,
        icon: 'achievement-first-challenge',
      },
      {
        title: 'Challenge Master',
        description: 'Complete 10 challenges',
        category: AchievementCategory.CHALLENGES,
        requirementType: RequirementType.CHALLENGES_COMPLETED,
        requirementValue: 10,
        pointsReward: 300,
        icon: 'achievement-challenge-master',
      },
      // Social Achievements
      {
        title: 'Social Butterfly',
        description: 'Add your first friend',
        category: AchievementCategory.SOCIAL,
        requirementType: RequirementType.FRIENDS_COUNT,
        requirementValue: 1,
        pointsReward: 25,
        icon: 'achievement-first-friend',
      },
      {
        title: 'Popular',
        description: 'Have 10 friends',
        category: AchievementCategory.SOCIAL,
        requirementType: RequirementType.FRIENDS_COUNT,
        requirementValue: 10,
        pointsReward: 200,
        icon: 'achievement-popular',
      },
    ];

    await this.achievementRepository.save(initialAchievements);
    this.logger.log(
      `Seeded ${initialAchievements.length} initial achievements`,
    );
  }
}
