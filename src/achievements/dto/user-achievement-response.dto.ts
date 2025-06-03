import { ApiProperty } from '@nestjs/swagger';
import { AchievementResponseDto } from './achievement-response.dto';
import { UserAchievement } from '../entities/user-achievement.entity';

export class UserAchievementResponseDto extends AchievementResponseDto {
  @ApiProperty({
    description: 'When this achievement was unlocked by the user',
    example: '2024-01-15T10:30:00.000Z',
  })
  unlockedAt: Date;

  static fromUserAchievement(
    userAchievement: UserAchievement,
  ): UserAchievementResponseDto {
    const dto = new UserAchievementResponseDto();

    // Copy achievement properties
    dto.id = userAchievement.achievement.id;
    dto.title = userAchievement.achievement.title;
    dto.description = userAchievement.achievement.description;
    dto.icon = userAchievement.achievement.icon;
    dto.category = userAchievement.achievement.category;
    dto.requirementType = userAchievement.achievement.requirementType;
    dto.requirementValue = userAchievement.achievement.requirementValue;
    dto.pointsReward = userAchievement.achievement.pointsReward;
    dto.isActive = userAchievement.achievement.isActive;
    dto.createdAt = userAchievement.achievement.createdAt;

    // Add user-specific data
    dto.unlockedAt = userAchievement.unlockedAt;

    return dto;
  }
}
