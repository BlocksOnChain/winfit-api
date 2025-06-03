import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Achievement } from './entities/achievement.entity';
import { UserAchievement } from './entities/user-achievement.entity';
import { User } from '../users/entities/user.entity';

@Injectable()
export class AchievementsService {
  constructor(
    @InjectRepository(Achievement)
    private readonly achievementRepository: Repository<Achievement>,
    @InjectRepository(UserAchievement)
    private readonly userAchievementRepository: Repository<UserAchievement>,
  ) {}

  async getUserAchievements(userId: string): Promise<Achievement[]> {
    const userAchievements = await this.userAchievementRepository.find({
      where: { user: { id: userId } },
      relations: ['achievement'],
      order: { unlockedAt: 'DESC' },
    });

    return userAchievements.map(ua => ({
      ...ua.achievement,
      unlockedAt: ua.unlockedAt,
    })) as any;
  }

  async getAvailableAchievements(): Promise<Achievement[]> {
    return this.achievementRepository.find({
      where: { isActive: true },
      order: { category: 'ASC', title: 'ASC' },
    });
  }

  async checkAndUnlockAchievements(user: User): Promise<UserAchievement[]> {
    const unlockedAchievements: UserAchievement[] = [];
    
    // Get all active achievements that the user hasn't unlocked yet
    const availableAchievements = await this.achievementRepository.find({
      where: { isActive: true },
    });

    const userAchievements = await this.userAchievementRepository.find({
      where: { user: { id: user.id } },
      relations: ['achievement'],
    });

    const unlockedAchievementIds = userAchievements.map(ua => ua.achievement.id);

    for (const achievement of availableAchievements) {
      if (unlockedAchievementIds.includes(achievement.id)) {
        continue; // Already unlocked
      }

      if (await this.checkAchievementRequirement(user, achievement)) {
        const userAchievement = this.userAchievementRepository.create({
          user,
          achievement,
          unlockedAt: new Date(),
        });

        const saved = await this.userAchievementRepository.save(userAchievement);
        unlockedAchievements.push(saved);

        // Award points if specified
        if (achievement.pointsReward > 0) {
          // This would typically update user's total points
          // For now, we'll leave this as a placeholder
        }
      }
    }

    return unlockedAchievements;
  }

  private async checkAchievementRequirement(user: User, achievement: Achievement): Promise<boolean> {
    if (!achievement.requirementType || achievement.requirementValue === undefined) {
      return false;
    }

    switch (achievement.requirementType) {
      case 'TOTAL_STEPS':
        return user.totalSteps >= achievement.requirementValue;
      
      case 'TOTAL_DISTANCE':
        return user.totalDistance >= achievement.requirementValue;
      
      case 'USER_LEVEL':
        return user.level >= achievement.requirementValue;
      
      case 'DAILY_STEPS':
        // This would require checking health data for a specific day
        // For now, we'll return false as a placeholder
        return false;
      
      case 'CHALLENGES_COMPLETED':
        // This would require counting completed challenges
        // For now, we'll return false as a placeholder
        return false;
      
      case 'FRIENDS_COUNT':
        // This would require counting user's friends
        // For now, we'll return false as a placeholder
        return false;
      
      default:
        return false;
    }
  }

  async unlockAchievement(userId: string, achievementId: string): Promise<UserAchievement> {
    const achievement = await this.achievementRepository.findOne({
      where: { id: achievementId },
    });

    if (!achievement) {
      throw new Error('Achievement not found');
    }

    const userAchievement = this.userAchievementRepository.create({
      user: { id: userId } as User,
      achievement,
      unlockedAt: new Date(),
    });

    return this.userAchievementRepository.save(userAchievement);
  }
} 