import { ApiProperty } from '@nestjs/swagger';
import {
  Achievement,
  AchievementCategory,
  RequirementType,
} from '../entities/achievement.entity';

export class AchievementResponseDto {
  @ApiProperty({
    description: 'Achievement unique identifier',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Achievement title',
    example: 'First Steps',
  })
  title: string;

  @ApiProperty({
    description: 'Achievement description',
    example: 'Take your first 1,000 steps',
    required: false,
  })
  description?: string;

  @ApiProperty({
    description: 'Achievement icon URL or identifier',
    example: 'achievement-first-steps.png',
    required: false,
  })
  icon?: string;

  @ApiProperty({
    description: 'Achievement category',
    enum: AchievementCategory,
    example: AchievementCategory.STEPS,
  })
  category: AchievementCategory;

  @ApiProperty({
    description: 'Type of requirement to unlock this achievement',
    enum: RequirementType,
    required: false,
    example: RequirementType.TOTAL_STEPS,
  })
  requirementType?: RequirementType;

  @ApiProperty({
    description: 'Value required to unlock this achievement',
    example: 1000,
    required: false,
  })
  requirementValue?: number;

  @ApiProperty({
    description: 'Points rewarded when achievement is unlocked',
    example: 50,
  })
  pointsReward: number;

  @ApiProperty({
    description: 'Whether this achievement is currently active',
    example: true,
  })
  isActive: boolean;

  @ApiProperty({
    description: 'When this achievement was created',
    example: '2024-01-01T00:00:00.000Z',
  })
  createdAt: Date;

  static fromEntity(achievement: Achievement): AchievementResponseDto {
    const dto = new AchievementResponseDto();
    dto.id = achievement.id;
    dto.title = achievement.title;
    dto.description = achievement.description;
    dto.icon = achievement.icon;
    dto.category = achievement.category;
    dto.requirementType = achievement.requirementType;
    dto.requirementValue = achievement.requirementValue;
    dto.pointsReward = achievement.pointsReward;
    dto.isActive = achievement.isActive;
    dto.createdAt = achievement.createdAt;
    return dto;
  }
}
