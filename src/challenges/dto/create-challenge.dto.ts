import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsDateString,
  IsPositive,
  MinLength,
  MaxLength,
  Min,
  Max,
} from 'class-validator';
import {
  ChallengeType,
  ChallengeCategory,
  ChallengeDifficulty,
  RewardType,
} from '../entities/challenge.entity';

export class CreateChallengeDto {
  @ApiProperty({
    description: 'Challenge title',
    example: 'December Step Challenge',
    minLength: 3,
    maxLength: 255,
  })
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  title: string;

  @ApiProperty({
    description: 'Challenge description',
    example: 'Walk 100,000 steps in December',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiProperty({
    enum: ChallengeType,
    description: 'Type of challenge',
    example: ChallengeType.INDIVIDUAL,
  })
  @IsEnum(ChallengeType)
  type: ChallengeType;

  @ApiProperty({
    enum: ChallengeCategory,
    description: 'Challenge category',
    example: ChallengeCategory.STEPS,
  })
  @IsEnum(ChallengeCategory)
  category: ChallengeCategory;

  @ApiProperty({
    description: 'Challenge goal (steps, distance in meters, time in minutes)',
    example: 100000,
    minimum: 1,
  })
  @IsNumber()
  @IsPositive()
  goal: number;

  @ApiProperty({
    description: 'Challenge duration in days',
    example: 30,
    minimum: 1,
    maximum: 365,
  })
  @IsNumber()
  @Min(1)
  @Max(365)
  duration: number;

  @ApiProperty({
    enum: ChallengeDifficulty,
    description: 'Challenge difficulty level',
    example: ChallengeDifficulty.MEDIUM,
  })
  @IsEnum(ChallengeDifficulty)
  difficulty: ChallengeDifficulty;

  @ApiProperty({
    description: 'Maximum number of participants',
    example: 1000,
    required: false,
    minimum: 1,
  })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  maxParticipants?: number;

  @ApiProperty({
    enum: RewardType,
    description: 'Type of reward',
    required: false,
    example: RewardType.POINTS,
  })
  @IsOptional()
  @IsEnum(RewardType)
  rewardType?: RewardType;

  @ApiProperty({
    description: 'Reward value (points, coupon code, etc.)',
    example: '500',
    required: false,
  })
  @IsOptional()
  @IsString()
  rewardValue?: string;

  @ApiProperty({
    description: 'Reward description',
    example: 'Earn 500 bonus points',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  rewardDescription?: string;

  @ApiProperty({
    description: 'Challenge start date',
    example: '2024-12-01T00:00:00Z',
  })
  @IsDateString()
  startDate: string;

  @ApiProperty({
    description: 'Challenge end date',
    example: '2024-12-31T23:59:59Z',
  })
  @IsDateString()
  endDate: string;

  @ApiProperty({
    description: 'Whether the challenge should be featured',
    example: false,
    required: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @ApiProperty({
    description: 'Challenge image URL',
    required: false,
  })
  @IsOptional()
  @IsString()
  challengeImageUrl?: string;

  @ApiProperty({
    description: 'Reward image URL',
    required: false,
  })
  @IsOptional()
  @IsString()
  rewardImageUrl?: string;
}
