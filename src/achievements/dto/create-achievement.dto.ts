import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsOptional,
  IsNumber,
  IsBoolean,
  Min,
} from 'class-validator';
import {
  AchievementCategory,
  RequirementType,
} from '../entities/achievement.entity';

export class CreateAchievementDto {
  @ApiProperty({
    description: 'Achievement title',
    example: 'First Steps',
  })
  @IsString()
  title: string;

  @ApiProperty({
    description: 'Achievement description',
    example: 'Take your first 1,000 steps',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'Achievement icon URL or identifier',
    example: 'achievement-first-steps.png',
    required: false,
  })
  @IsString()
  @IsOptional()
  icon?: string;

  @ApiProperty({
    description: 'Achievement category',
    enum: AchievementCategory,
    example: AchievementCategory.STEPS,
  })
  @IsEnum(AchievementCategory)
  category: AchievementCategory;

  @ApiProperty({
    description: 'Type of requirement to unlock this achievement',
    enum: RequirementType,
    required: false,
    example: RequirementType.TOTAL_STEPS,
  })
  @IsEnum(RequirementType)
  @IsOptional()
  requirementType?: RequirementType;

  @ApiProperty({
    description: 'Value required to unlock this achievement',
    example: 1000,
    required: false,
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  requirementValue?: number;

  @ApiProperty({
    description: 'Points rewarded when achievement is unlocked',
    example: 50,
    default: 0,
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  pointsReward?: number;

  @ApiProperty({
    description: 'Whether this achievement is currently active',
    example: true,
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
