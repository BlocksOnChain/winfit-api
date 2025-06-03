import { ApiProperty } from '@nestjs/swagger';
import {
  IsOptional,
  IsEnum,
  IsBoolean,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  ChallengeType,
  ChallengeCategory,
  ChallengeDifficulty,
} from '../entities/challenge.entity';

export enum ChallengeStatus {
  UPCOMING = 'upcoming',
  ACTIVE = 'active',
  COMPLETED = 'completed',
}

export class ChallengeQueryDto {
  @ApiProperty({
    enum: ChallengeType,
    required: false,
    description: 'Filter by challenge type',
  })
  @IsOptional()
  @IsEnum(ChallengeType)
  type?: ChallengeType;

  @ApiProperty({
    enum: ChallengeCategory,
    required: false,
    description: 'Filter by challenge category',
  })
  @IsOptional()
  @IsEnum(ChallengeCategory)
  category?: ChallengeCategory;

  @ApiProperty({
    enum: ChallengeDifficulty,
    required: false,
    description: 'Filter by challenge difficulty',
  })
  @IsOptional()
  @IsEnum(ChallengeDifficulty)
  difficulty?: ChallengeDifficulty;

  @ApiProperty({
    enum: ChallengeStatus,
    required: false,
    description: 'Filter by challenge status',
  })
  @IsOptional()
  @IsEnum(ChallengeStatus)
  status?: ChallengeStatus;

  @ApiProperty({
    type: Boolean,
    required: false,
    description: 'Filter by featured challenges',
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  featured?: boolean;

  @ApiProperty({
    type: Number,
    required: false,
    default: 20,
    minimum: 1,
    maximum: 100,
    description: 'Number of challenges to return',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiProperty({
    type: Number,
    required: false,
    default: 0,
    minimum: 0,
    description: 'Number of challenges to skip',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  offset?: number = 0;
}
