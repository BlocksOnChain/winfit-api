import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';
import { AchievementCategory } from '../entities/achievement.entity';

export class AchievementQueryDto {
  @ApiProperty({
    description: 'Filter by achievement category',
    enum: AchievementCategory,
    required: false,
    example: AchievementCategory.STEPS,
  })
  @IsEnum(AchievementCategory)
  @IsOptional()
  category?: AchievementCategory;

  @ApiProperty({
    description: 'Filter by active status',
    required: false,
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  isActive?: boolean;

  @ApiProperty({
    description: 'Filter to show only unlocked achievements',
    required: false,
    example: false,
  })
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  unlockedOnly?: boolean;

  @ApiProperty({
    description: 'Filter to show only locked achievements',
    required: false,
    example: false,
  })
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  lockedOnly?: boolean;
}
